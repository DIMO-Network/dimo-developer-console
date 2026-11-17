'use client';
import { FC } from 'react';
import classNames from 'classnames';
import { useTranslations } from 'next-intl';
import {
  subjectLabel,
  subjectSublabel,
  type SubjectGraph,
  type Subject,
} from '@/services/subjects/graph';
import type { LatestIndexHeader } from '@/hooks/subjects/useSubjectFreshness';
import { FreshnessDot } from '@/components/FreshnessDot';
import { SelectWithChevron } from '@/components/SelectWithChevron';

export type Access =
  | 'ok'
  | 'not-shared'
  | 'no-jwt'
  | 'jwt-expired'
  | 'session-expired'
  | 'no-access'
  | 'removed'
  | 'reconnect'
  | 'unavailable'
  | 'error'
  | 'loading';
export type AccountState = 'unknown' | 'loading' | 'shared' | 'not-shared';

interface Props {
  graph: SubjectGraph;
  freshness: Record<string, LatestIndexHeader>;
  freshnessLoading?: boolean;
  // Per subject DID: why its freshness couldn't be read, or null.
  freshnessErrors?: Record<string, string | null>;
  selected: string; // a subject DID or 'sharing'
  onSelect: (key: string) => void;
  access: Access;
  accountState: AccountState;
  now?: number;
}

const ACCESS_KEY: Record<Exclude<Access, 'ok'>, string> = {
  'not-shared': 'notShared',
  'no-jwt': 'noJwt',
  'jwt-expired': 'jwtExpired',
  'session-expired': 'sessionExpired',
  'no-access': 'noAccess',
  'removed': 'removed',
  'reconnect': 'reconnect',
  'unavailable': 'unavailable',
  'error': 'error',
  'loading': 'loading',
};
const ACCOUNT_KEY: Record<AccountState, string> = {
  'unknown': 'unknown',
  'loading': 'loading',
  'shared': 'shared',
  'not-shared': 'notShared',
};

const Item: FC<{
  subject: Subject;
  selected: boolean;
  nested?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}> = ({ subject, selected, nested, onSelect, children }) => {
  const t = useTranslations('vehicles');
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? 'true' : undefined}
      data-nested={nested ? '' : undefined}
      className={classNames(
        'flex w-full flex-col gap-1 rounded-control px-3 py-2.5 text-left transition-colors hover:bg-control',
        selected && 'bg-control shadow-selected',
      )}
    >
      <span className="text-body-sm font-medium text-ink">
        {subjectLabel(subject, t)}
      </span>
      <span className="text-label text-muted">{subjectSublabel(subject, t)}</span>
      <span className="pt-0.5 text-label text-fg">{children}</span>
    </button>
  );
};

// The rail: the vehicle, its devices nested under it, the owner's documents,
// then Sharing. Freshness comes from one aliased latestIndex call (the page
// owns it); the account subject shows its grant state instead.
export const SourceRail: FC<Props> = ({
  graph,
  freshness,
  freshnessLoading = false,
  freshnessErrors = {},
  selected,
  onSelect,
  access,
  accountState,
  now,
}) => {
  const t = useTranslations('vehicles');
  const accessLabel = (a: Exclude<Access, 'ok'>) => t(`rail.access.${ACCESS_KEY[a]}`);
  const fresh = (s: Subject) => {
    if (access !== 'ok') return <span className="text-muted">{accessLabel(access)}</span>;
    if (freshnessLoading) return <span className="text-muted">{t('rail.checking')}</span>;
    const failed = freshnessErrors[s.did];
    if (failed)
      return (
        <span className="text-muted" title={failed}>
          {t('rail.unavailable')}
        </span>
      );
    return (
      <FreshnessDot
        at={freshness[s.did]?.time ?? null}
        now={now}
        // Important: FreshnessDot's own text-body-sm comes later in Tailwind 4's CSS.
        className="text-label!"
      />
    );
  };

  const options = [
    ...graph.all.map((s) => ({
      value: s.did,
      label: t('subjects.option', {
        label: subjectLabel(s, t),
        sublabel: subjectSublabel(s, t),
      }),
    })),
    { value: 'sharing', label: t('rail.sharing') },
  ];

  return (
    <>
      <div className="md:hidden">
        <SelectWithChevron
          options={options}
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          name="subject"
        />
      </div>
      <nav
        aria-label={t('rail.dataSources')}
        className="hidden flex-col gap-0.5 rounded-card bg-card p-2 md:flex"
      >
        <span className="px-2.5 pb-1 pt-2 text-label text-muted">
          {t('rail.dataSources')}
        </span>
        <Item
          subject={graph.vehicle}
          selected={selected === graph.vehicle.did}
          onSelect={() => onSelect(graph.vehicle.did)}
        >
          {fresh(graph.vehicle)}
        </Item>
        {graph.devices.length > 0 && (
          <div className="ml-4 flex flex-col gap-0.5 border-l border-outline pl-2">
            {graph.devices.map((d) => (
              <Item
                key={d.did}
                subject={d}
                nested
                selected={selected === d.did}
                onSelect={() => onSelect(d.did)}
              >
                {fresh(d)}
              </Item>
            ))}
          </div>
        )}
        <span className="px-2.5 pb-1 pt-3 text-label text-muted">{t('rail.owner')}</span>
        <Item
          subject={graph.account}
          selected={selected === graph.account.did}
          onSelect={() => onSelect(graph.account.did)}
        >
          <span className={accountState === 'shared' ? 'text-fg' : 'text-muted'}>
            {access === 'ok'
              ? t(`rail.account.${ACCOUNT_KEY[accountState]}`)
              : accessLabel(access)}
          </span>
        </Item>
        <div className="mx-1 my-1.5 h-px bg-outline" />
        <button
          type="button"
          onClick={() => onSelect('sharing')}
          aria-current={selected === 'sharing' ? 'true' : undefined}
          className={classNames(
            'flex w-full flex-col gap-1 rounded-control px-3 py-2.5 text-left transition-colors hover:bg-control',
            selected === 'sharing' && 'bg-control shadow-selected',
          )}
        >
          <span className="text-body-sm font-medium text-ink">{t('rail.sharing')}</span>
          <span className="text-label text-muted">{t('rail.appsWithAccess')}</span>
        </button>
      </nav>
    </>
  );
};
