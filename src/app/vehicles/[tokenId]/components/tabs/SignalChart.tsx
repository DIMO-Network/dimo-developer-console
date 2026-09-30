'use client';
import { FC } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { humanizeSignal } from '@/utils/humanizeSignal';

export type Point = { t: string; v: number | null };

const tick = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

export const SignalChart: FC<{ name: string; points: Point[]; colorIndex: number }> = ({
  name,
  points,
  colorIndex,
}) => {
  const color = `rgb(var(--chart-${(colorIndex % 6) + 1}))`;
  return (
    <div className="flex flex-col gap-2 border-t border-outline pt-3">
      <div className="flex items-baseline gap-2.5">
        <span
          className="h-[3px] w-2.5 self-center rounded-sm"
          style={{ background: color }}
        />
        <span className="text-body-sm font-semibold text-ink">
          {humanizeSignal(name)}
        </span>
        <span className="font-mono text-code text-muted">{name}</span>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgb(var(--outline))" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={tick}
              stroke="rgb(var(--muted))"
              tick={{ fontSize: 11 }}
              minTickGap={48}
            />
            <YAxis stroke="rgb(var(--muted))" tick={{ fontSize: 11 }} width={44} />
            <Tooltip
              labelFormatter={(l) => String(l).replace('T', ' ').slice(0, 16) + ' UTC'}
              contentStyle={{
                background: 'rgb(var(--overlay))',
                border: '1px solid rgb(var(--outline))',
                borderRadius: 10,
                color: 'rgb(var(--fg))',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke={color}
              strokeWidth={1.75}
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
