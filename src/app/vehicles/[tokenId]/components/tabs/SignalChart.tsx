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

const DAY_MS = 86_400_000;

// Short ranges need the time of day; long ones read better as a date. UTC.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n: number) => String(n).padStart(2, '0');

export const formatTick = (iso: string, spanMs: number) => {
  const d = new Date(iso);
  const day = `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`;
  return spanMs < 2 * DAY_MS
    ? `${day} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
    : day;
};

const describe = (name: string, points: Point[]) => {
  const vals = points.flatMap((p) => (p.v === null ? [] : [p.v]));
  const head = `${humanizeSignal(name)}, ${points.length} points`;
  return vals.length
    ? `${head}, ${Math.min(...vals)}\u2013${Math.max(...vals)}`
    : `${head}, no values`;
};

export const SignalChart: FC<{ name: string; points: Point[]; colorIndex: number }> = ({
  name,
  points,
  colorIndex,
}) => {
  const spanMs =
    points.length > 1
      ? Date.parse(points[points.length - 1].t) - Date.parse(points[0].t)
      : 0;
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
      <div className="h-40 w-full" role="img" aria-label={describe(name, points)}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="rgb(var(--outline))" vertical={false} />
            <XAxis
              dataKey="t"
              tickFormatter={(t: string) => formatTick(t, spanMs)}
              stroke="rgb(var(--muted))"
              tick={{ fontSize: 11 }}
              minTickGap={72}
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
