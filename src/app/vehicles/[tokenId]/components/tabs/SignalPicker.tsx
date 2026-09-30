'use client';
import { FC, useState } from 'react';
import { XMarkIcon, PlusIcon } from '@heroicons/react/16/solid';
import { humanizeSignal } from '@/utils/humanizeSignal';
import { TextField } from '@/components/TextField';

// Selected signals as inverse-ink chips; "Add signal" opens a searchable
// checkbox list of what this subject actually reports.
export const SignalPicker: FC<{
  available: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  loading?: boolean;
  empty?: boolean;
}> = ({ available, selected, onChange, loading, empty }) => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const shown = available.filter((s) => {
    const f = filter.trim().toLowerCase();
    return (
      !f || s.toLowerCase().includes(f) || humanizeSignal(s).toLowerCase().includes(f)
    );
  });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-label text-muted">Signals</span>
        {selected.map((s) => (
          <span
            key={s}
            className="flex h-8 items-center gap-1.5 rounded-full bg-selected-bg pl-3 pr-1.5 text-[13px] font-medium text-selected-fg"
          >
            {humanizeSignal(s)}
            <button
              type="button"
              aria-label={`Remove ${humanizeSignal(s)}`}
              onClick={() => onChange(selected.filter((x) => x !== s))}
              className="flex size-5 items-center justify-center rounded-full hover:bg-highest/30"
            >
              <XMarkIcon className="size-3" />
            </button>
          </span>
        ))}
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex h-8 items-center gap-1.5 rounded-full border border-dashed border-outline px-3 text-[13px] text-muted transition-colors hover:bg-control hover:text-ink"
        >
          <PlusIcon className="size-3" />
          Add signal
        </button>
        <span className="text-label text-muted">
          {loading
            ? 'Loading signals\u2026'
            : empty
              ? 'This source reports no signals yet.'
              : `From ${available.length} signals on this source`}
        </span>
      </div>
      {open && (
        <div
          onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
          className="flex max-h-72 w-full max-w-md flex-col gap-1 overflow-auto rounded-control border border-outline bg-overlay p-2 shadow-float"
        >
          <TextField
            placeholder="Find a signal"
            aria-label="Find a signal"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          {shown.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-2.5 rounded-chip px-2 py-1.5 hover:bg-control"
            >
              <input
                type="checkbox"
                className="size-4 accent-accent"
                checked={selected.includes(s)}
                aria-label={humanizeSignal(s)}
                onChange={(e) =>
                  onChange(
                    e.target.checked ? [...selected, s] : selected.filter((x) => x !== s),
                  )
                }
              />
              <span className="flex flex-col">
                <span className="text-body-sm text-ink">{humanizeSignal(s)}</span>
                <span className="font-mono text-code text-muted">{s}</span>
              </span>
            </label>
          ))}
          {shown.length === 0 && (
            <p className="px-2 py-1.5 text-body-sm text-muted">
              {empty ? 'This source reports no signals yet.' : 'No signals match.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
