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

export const compact = (n: number): string => {
  const m = (v: number) => `${(v / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (n >= 1_000_000) return m(n);
  if (n >= 1_000) {
    const k = Number((n / 1_000).toFixed(1));
    return k >= 1000 ? m(n) : `${String(k)}K`;
  }
  return String(n);
};
