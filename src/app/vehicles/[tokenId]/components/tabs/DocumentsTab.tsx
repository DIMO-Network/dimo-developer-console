'use client';
import { FC } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { fieldError } from '@/services/subjects/client';
import {
  availableCloudEventTypesQuery,
  latestCloudEventQuery,
} from '@/services/subjects/queries';
import { documentSharingUrl } from '@/utils/documentSharingUrl';
import { humanizeSignal } from '@/utils/humanizeSignal';
import { useFreshnessText } from '@/hooks/useFreshnessText';
import { safeHttpUrl } from '@/utils/safeHttpUrl';
import { Button } from '@/components/Button';

const DOCUMENT_TITLE_KEYS: Record<string, string> = {
  'dimo.document.driver.license': 'driverLicense',
  'dimo.document.driver.insurance': 'insurance',
  'dimo.document.driver.id': 'idCard',
  'dimo.document.driver.membership': 'membership',
  'dimo.document.driver.other': 'other',
};
type Types = {
  availableCloudEventTypes: { type: string; count: number; lastSeen: string }[] | null;
};
type Doc = {
  latestCloudEvent: {
    header: { type: string; time: string };
    data: unknown;
    dataUrl?: string | null;
  } | null;
};

const fields = (data: unknown): [string, string][] =>
  data && typeof data === 'object' && !Array.isArray(data)
    ? Object.entries(data as Record<string, unknown>)
        .filter(
          ([, v]) => v === null || ['string', 'number', 'boolean'].includes(typeof v),
        )
        .map(([k, v]) => [humanizeSignal(k), v === null ? '—' : String(v)])
    : [];

const DocumentCard: FC<{ type: string; subject: Subject; ctx: SubjectContext }> = ({
  type,
  subject,
  ctx,
}) => {
  const t = useTranslations('vehicles');
  const { relativeTime } = useFreshnessText();
  const q = useSubjectQuery<Doc>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: latestCloudEventQuery(
      subject.fetchDid,
      { ...subject.fetchFilter, type },
      true,
    ),
  });
  const doc = q.data?.data?.latestCloudEvent;
  const error = q.error?.message ?? fieldError(q.data?.errors, 'latestCloudEvent');
  const scanUrl = safeHttpUrl(doc?.dataUrl);
  return (
    <div className="flex flex-col gap-3.5 rounded-card bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-card-title text-ink">
            {DOCUMENT_TITLE_KEYS[type]
              ? t(`documents.titles.${DOCUMENT_TITLE_KEYS[type]}`)
              : humanizeSignal(type.split('.').at(-1) ?? type)}
          </span>
          <span className="font-mono text-code text-muted">{type}</span>
        </span>
        {doc && (
          <span className="whitespace-nowrap text-label text-muted">
            {t('documents.updated', { time: relativeTime(doc.header.time) })}
          </span>
        )}
      </div>
      {error && <p className="text-body-sm text-negative">{error}</p>}
      {doc && (
        <div className="grid grid-cols-1 gap-x-5 gap-y-2.5 md:grid-cols-2">
          {fields(doc.data).map(([k, v]) => (
            <span key={k} className="flex flex-col gap-0.5 border-b border-outline pb-2">
              <span className="text-label text-muted">{k}</span>
              <span className="text-body-sm text-fg">{v}</span>
            </span>
          ))}
          {fields(doc.data).length === 0 && (
            <span className="text-body-sm text-muted">{t('documents.noFields')}</span>
          )}
        </div>
      )}
      <div className="flex items-center gap-1">
        {scanUrl && (
          <a href={scanUrl} target="_blank" rel="noreferrer" className="button secondary">
            {t('documents.openScan')}
          </a>
        )}
        <Button variant="ghost" onClick={() => ctx.onBrowseRaw(subject.did)}>
          {t('documents.viewRawEvent')}
        </Button>
      </div>
    </div>
  );
};

const SharingLinkCard: FC<{ ctx: SubjectContext; title: string; body: string }> = ({
  ctx,
  title,
  body,
}) => {
  const t = useTranslations('vehicles');
  return (
    <div className="flex flex-col items-start gap-3 rounded-card bg-card p-5 md:flex-row md:items-center md:justify-between">
      <span className="flex flex-col gap-0.5">
        <span className="text-body-sm font-medium text-ink">{title}</span>
        <span className="text-body-sm text-muted">{body}</span>
      </span>
      <Button
        variant="secondary"
        onClick={() => {
          const url = documentSharingUrl({
            clientId: ctx.clientId,
            redirectUri: ctx.license.firstRedirectURI,
          });
          navigator.clipboard
            .writeText(url)
            .then(() => toast.success(t('documents.linkCopied')))
            .catch(() => toast.error(t('documents.linkCopyFailed')));
        }}
      >
        {t('documents.copyLink')}
      </Button>
    </div>
  );
};

export const DocumentsTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const t = useTranslations('vehicles');
  const types = useSubjectQuery<Types>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: availableCloudEventTypesQuery(subject.fetchDid, subject.fetchFilter),
  });
  const docTypes = (types.data?.data?.availableCloudEventTypes ?? [])
    .map((row) => row.type)
    .filter((type) => type.startsWith('dimo.document.'));
  const label = ctx.license.label;
  const typesError =
    types.error?.message ?? fieldError(types.data?.errors, 'availableCloudEventTypes');

  if (types.error?.code === 'NOT_SHARED') {
    return (
      <SharingLinkCard
        ctx={ctx}
        title={t('documents.notSharedTitle', { license: label })}
        body={t('documents.notSharedBody')}
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-body-sm text-muted">
        {t('documents.intro', { license: label })}
      </p>
      {typesError && <p className="px-1 text-body-sm text-negative">{typesError}</p>}
      {types.isLoading && (
        <p className="px-1 text-body-sm text-muted">{t('documents.loading')}</p>
      )}
      {!types.isLoading && !typesError && docTypes.length === 0 && (
        <p className="px-1 text-body-sm text-muted">{t('documents.noneUploaded')}</p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {docTypes.map((type) => (
          <DocumentCard key={type} type={type} subject={subject} ctx={ctx} />
        ))}
      </div>
      <SharingLinkCard
        ctx={ctx}
        title={t('documents.needAnotherTitle')}
        body={t('documents.needAnotherBody')}
      />
    </div>
  );
};
