'use client';
import { FC } from 'react';
import { toast } from 'sonner';
import type { Subject } from '@/services/subjects/graph';
import type { SubjectContext } from '../SubjectView';
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import {
  availableCloudEventTypesQuery,
  latestCloudEventQuery,
} from '@/services/subjects/queries';
import { documentSharingUrl } from '@/utils/documentSharingUrl';
import { humanizeSignal } from '@/utils/humanizeSignal';
import { relativeTime } from '@/utils/freshness';
import { safeHttpUrl } from '@/utils/safeHttpUrl';
import { Button } from '@/components/Button';

export const DOCUMENT_TITLES: Record<string, string> = {
  'dimo.document.driver.license': "Driver's license",
  'dimo.document.driver.insurance': 'Insurance card',
  'dimo.document.driver.id': 'ID card',
  'dimo.document.driver.membership': 'Membership card',
  'dimo.document.driver.other': 'Other document',
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
  const q = useSubjectQuery<Doc>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: latestCloudEventQuery(subject.did, { type }, true),
  });
  const doc = q.data?.data?.latestCloudEvent;
  const scanUrl = safeHttpUrl(doc?.dataUrl);
  return (
    <div className="flex flex-col gap-3.5 rounded-card bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="flex flex-col gap-0.5">
          <span className="text-card-title text-ink">
            {DOCUMENT_TITLES[type] ?? humanizeSignal(type.split('.').at(-1) ?? type)}
          </span>
          <span className="font-mono text-code text-muted">{type}</span>
        </span>
        {doc && (
          <span className="whitespace-nowrap text-label text-muted">
            Updated {relativeTime(doc.header.time)}
          </span>
        )}
      </div>
      {q.error && <p className="text-body-sm text-negative">{q.error.message}</p>}
      {doc && (
        <div className="grid grid-cols-1 gap-x-5 gap-y-2.5 md:grid-cols-2">
          {fields(doc.data).map(([k, v]) => (
            <span key={k} className="flex flex-col gap-0.5 border-b border-outline pb-2">
              <span className="text-label text-muted">{k}</span>
              <span className="text-body-sm text-fg">{v}</span>
            </span>
          ))}
          {fields(doc.data).length === 0 && (
            <span className="text-body-sm text-muted">
              No extracted fields; open the raw event.
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-1">
        {scanUrl && (
          <a href={scanUrl} target="_blank" rel="noreferrer" className="button secondary">
            Open scan
          </a>
        )}
        <Button variant="ghost" onClick={() => ctx.onBrowseRaw(subject.did)}>
          View raw event
        </Button>
      </div>
    </div>
  );
};

const SharingLinkCard: FC<{ ctx: SubjectContext; title: string; body: string }> = ({
  ctx,
  title,
  body,
}) => (
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
          .then(() => toast.success('Sharing link copied'))
          .catch(() => toast.error('Could not copy the link'));
      }}
    >
      Copy sharing link
    </Button>
  </div>
);

export const DocumentsTab: FC<{ subject: Subject; ctx: SubjectContext }> = ({
  subject,
  ctx,
}) => {
  const types = useSubjectQuery<Types>({
    api: 'fetch',
    asset: subject.asset,
    clientId: ctx.clientId,
    request: availableCloudEventTypesQuery(subject.did),
  });
  const docTypes = (types.data?.data?.availableCloudEventTypes ?? [])
    .map((t) => t.type)
    .filter((t) => t.startsWith('dimo.document.'));
  const label = ctx.license.label;

  if (types.error?.code === 'NOT_SHARED') {
    return (
      <SharingLinkCard
        ctx={ctx}
        title={`The owner hasn't shared documents with ${label}`}
        body="Send them this link. It opens the DIMO app and asks them to share their documents with your license."
      />
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-body-sm text-muted">
        Documents the owner shared with {label} from the DIMO app. Each one is a cloud
        event on the owner&apos;s account DID, with the extracted fields as data and the
        scan behind a signed link.
      </p>
      {types.error && (
        <p className="px-1 text-body-sm text-negative">{types.error.message}</p>
      )}
      {types.isLoading && <p className="px-1 text-body-sm text-muted">Loading…</p>}
      {!types.isLoading && !types.error && docTypes.length === 0 && (
        <p className="px-1 text-body-sm text-muted">
          The owner hasn&apos;t uploaded any documents yet.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {docTypes.map((t) => (
          <DocumentCard key={t} type={t} subject={subject} ctx={ctx} />
        ))}
      </div>
      <SharingLinkCard
        ctx={ctx}
        title="Need another document?"
        body="Send the owner a link that asks them to share documents with your license. It opens in the DIMO app."
      />
    </div>
  );
};
