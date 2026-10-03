'use client';
import { type FC, useState } from 'react';
import classNames from 'classnames';

export interface RowAction {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

// VehicleDetailsTable's ⋯ pattern: one 32px button per row, so the action cell
// fits a 390px phone however many actions a row has (DESIGN.md, Table).
export const RowActionsMenu: FC<{ label: string; items: RowAction[] }> = ({
  label,
  items,
}) => {
  const [open, setOpen] = useState(false);
  if (!items.length) return null;
  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-full text-body leading-none text-muted transition-colors hover:bg-control hover:text-ink"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ⋯
      </button>
      {open && (
        <>
          {/* backdrop to close on outside click */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 min-w-[180px] rounded-control border border-outline bg-overlay p-1 shadow-float"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={classNames(
                  'w-full rounded-chip px-3 py-2 text-left text-body-sm transition-colors',
                  item.destructive
                    ? 'text-negative hover:bg-negative-soft'
                    : 'text-fg hover:bg-control',
                )}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
