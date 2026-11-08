import { FC, ReactNode } from 'react';
import classNames from 'classnames';

// Stat card recipe (DESIGN.md): tonal card, big number, small caption.
export const StatCard: FC<{
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  className?: string;
}> = ({ label, value, caption, className }) => (
  <div className={classNames('flex flex-col gap-2 rounded-card bg-card p-5', className)}>
    <span className="text-label text-muted">{label}</span>
    <span className="text-[28px] font-semibold leading-[34px] tracking-[-0.02em] text-ink">
      {value}
    </span>
    {caption && <span className="text-label text-muted">{caption}</span>}
  </div>
);

// For format.number: "1.2K", "1.24M" in English, the locale's own units elsewhere.
export const compact = (n: number) =>
  ({ notation: 'compact', maximumFractionDigits: n >= 1_000_000 ? 2 : 1 }) as const;
