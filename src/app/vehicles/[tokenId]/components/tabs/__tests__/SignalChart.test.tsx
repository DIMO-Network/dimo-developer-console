import { cloneElement, ReactElement } from 'react';
import { render } from '@testing-library/react';
import { SignalChart } from '../SignalChart';

// jsdom has no layout, so ResponsiveContainer would measure 0 and draw nothing.
jest.mock('recharts', () => {
  const actual = jest.requireActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: ReactElement }) =>
      cloneElement(children as ReactElement<{ width: number; height: number }>, {
        width: 400,
        height: 160,
      }),
  };
});

const points = [
  { t: '2026-10-29T10:00:00Z', v: 10 },
  { t: '2026-10-29T11:00:00Z', v: 12 },
];

it('draws the chart without adding a keyboard stop (the wrapper is the accessible image)', () => {
  const { container } = render(
    <SignalChart name="speed" points={points} colorIndex={0} />,
  );
  const svg = container.querySelector('svg.recharts-surface');
  expect(svg).not.toBeNull();
  expect(container.querySelector('[tabindex]:not([tabindex="-1"])')).toBeNull();
  expect(container.querySelector('[role="application"]')).toBeNull();
});
