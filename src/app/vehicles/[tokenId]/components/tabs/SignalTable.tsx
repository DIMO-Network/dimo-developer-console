'use client';
import { FC, useMemo, useState } from 'react';
import classNames from 'classnames';
import { TextField } from '@/components/TextField';
import { FreshnessDot } from '@/components/FreshnessDot';
import { humanizeSignal } from '@/utils/humanizeSignal';

export type SignalRow = {
  name: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  from?: string[];
};
type SortKey = 'name' | 'count' | 'firstSeen' | 'lastSeen';

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

export const SignalTable: FC<{
  rows: SignalRow[];
  showFrom: boolean;
  filter: string;
}> = ({ rows, showFrom, filter }) => {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: 'lastSeen',
    dir: -1,
  });
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        !f ||
        r.name.toLowerCase().includes(f) ||
        humanizeSignal(r.name).toLowerCase().includes(f),
    );
    const val = (r: SignalRow) =>
      sort.key === 'name'
        ? humanizeSignal(r.name)
        : sort.key === 'count'
          ? r.count
          : Date.parse(r[sort.key]);
    return [...list].sort((a, b) =>
      val(a) > val(b) ? sort.dir : val(a) < val(b) ? -sort.dir : 0,
    );
  }, [rows, filter, sort]);
  const head = (key: SortKey, label: string, right = false) => (
    <button
      type="button"
      onClick={() =>
        setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))
      }
      className={classNames(
        'text-label text-muted hover:text-ink',
        right ? 'text-right' : 'text-left',
      )}
    >
      {label}
      {sort.key === key ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
    </button>
  );
  const cols = showFrom
    ? 'grid-cols-[minmax(0,2.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]'
    : 'grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]';
  return (
    <div className="flex flex-col">
      <div className={classNames('grid gap-4 border-t border-outline px-5 py-2', cols)}>
        {head('name', 'Signal')}
        {head('count', 'Data points', true)}
        {head('firstSeen', 'First seen')}
        {head('lastSeen', 'Last seen')}
        {showFrom && <span className="text-label text-muted">From</span>}
      </div>
      {shown.map((r) => (
        <div
          key={r.name}
          className={classNames(
            'grid items-center gap-4 border-t border-outline px-5 py-2',
            cols,
          )}
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-body-sm font-medium text-ink">
              {humanizeSignal(r.name)}
            </span>
            <span className="truncate font-mono text-code text-muted">{r.name}</span>
          </span>
          <span className="text-right text-body-sm text-fg">
            {r.count.toLocaleString('en-US')}
          </span>
          <span className="text-body-sm text-fg">{date(r.firstSeen)}</span>
          <FreshnessDot at={r.lastSeen} />
          {showFrom && (
            <span className="flex flex-wrap gap-1">
              {(r.from ?? []).map((f) => (
                <span
                  key={f}
                  className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted"
                >
                  {f}
                </span>
              ))}
            </span>
          )}
        </div>
      ))}
      {shown.length === 0 && (
        <p className="border-t border-outline px-5 py-3 text-body-sm text-muted">
          No signals match.
        </p>
      )}
    </div>
  );
};

export const SignalFilter: FC<{ value: string; onChange: (v: string) => void }> = ({
  value,
  onChange,
}) => (
  <TextField
    placeholder="Filter signals"
    aria-label="Filter signals"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    wrapperClassName="w-60"
  />
);
