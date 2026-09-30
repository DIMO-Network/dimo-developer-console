'use client';
import { FC } from 'react';
import classNames from 'classnames';
import type { SubjectGraph, Subject } from '@/services/subjects/graph';
import type { LatestIndexHeader } from '@/hooks/subjects/useSubjectFreshness';
import { FreshnessDot } from '@/components/FreshnessDot';
import { SelectWithChevron } from '@/components/SelectWithChevron';

export type Access = 'ok' | 'not-shared' | 'no-jwt' | 'loading';
export type AccountState = 'unknown' | 'loading' | 'shared' | 'not-shared';

interface Props {
  graph: SubjectGraph;
  freshness: Record<string, LatestIndexHeader>;
  selected: string; // a subject DID or 'sharing'
  onSelect: (key: string) => void;
  access: Access;
  accountState: AccountState;
  now?: number;
}

const ACCESS_LABEL: Record<Exclude<Access, 'ok'>, string> = {
  'not-shared': 'No access',
  'no-jwt': 'Needs a developer JWT',
  'loading': 'Checking…',
};
const ACCOUNT_LABEL: Record<AccountState, string> = {
  'unknown': '—',
  'loading': 'Checking…',
  'shared': 'Shared',
  'not-shared': 'Not shared',
};

const Item: FC<{
  subject: Subject;
  selected: boolean;
  nested?: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}> = ({ subject, selected, nested, onSelect, children }) => (
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
    <span className="text-body-sm font-medium text-ink">{subject.label}</span>
    <span className="text-label text-muted">{subject.sublabel}</span>
    <span className="pt-0.5 text-label text-fg">{children}</span>
  </button>
);

// The rail: the vehicle, its devices nested under it, the owner's documents,
// then Sharing. Freshness comes from one aliased latestIndex call (the page
// owns it); the account subject shows its grant state instead.
export const SourceRail: FC<Props> = ({
  graph,
  freshness,
  selected,
  onSelect,
  access,
  accountState,
  now,
}) => {
  const fresh = (s: Subject) =>
    access === 'ok' ? (
      <FreshnessDot
        at={freshness[s.did]?.time ?? null}
        now={now}
        className="text-label"
      />
    ) : (
      <span className="text-muted">{ACCESS_LABEL[access]}</span>
    );

  const options = [
    ...graph.all.map((s) => ({ value: s.did, label: `${s.label} · ${s.sublabel}` })),
    { value: 'sharing', label: 'Sharing' },
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
        aria-label="Data sources"
        className="hidden flex-col gap-0.5 rounded-card bg-card p-2 md:flex"
      >
        <span className="px-2.5 pb-1 pt-2 text-label text-muted">Data sources</span>
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
        <span className="px-2.5 pb-1 pt-3 text-label text-muted">Owner</span>
        <Item
          subject={graph.account}
          selected={selected === graph.account.did}
          onSelect={() => onSelect(graph.account.did)}
        >
          <span className={accountState === 'shared' ? 'text-fg' : 'text-muted'}>
            {access === 'ok' ? ACCOUNT_LABEL[accountState] : ACCESS_LABEL[access]}
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
          <span className="text-body-sm font-medium text-ink">Sharing</span>
          <span className="text-label text-muted">Apps with access</span>
        </button>
      </nav>
    </>
  );
};
