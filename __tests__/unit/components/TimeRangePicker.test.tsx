import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimeRangePicker, resolveRange } from '@/components/TimeRangePicker';

const NOW = Date.parse('2026-09-29T20:49:00Z');

describe('resolveRange', () => {
  it('computes presets back from now, in UTC', () => {
    expect(resolveRange('24h', NOW)).toEqual({
      from: '2026-09-28T20:49:00.000Z',
      to: '2026-09-29T20:49:00.000Z',
    });
    expect(resolveRange('7d', NOW).from).toBe('2026-09-22T20:49:00.000Z');
    expect(resolveRange('30d', NOW).from).toBe('2026-08-30T20:49:00.000Z');
  });
});

describe('TimeRangePicker', () => {
  it('switches presets and exposes custom inputs', () => {
    const onChange = jest.fn();
    render(
      <TimeRangePicker
        value={{ preset: '7d', ...resolveRange('7d', NOW) }}
        onChange={onChange}
        now={NOW}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: '24 h' }));
    expect(onChange).toHaveBeenCalledWith({ preset: '24h', ...resolveRange('24h', NOW) });
    fireEvent.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ preset: 'custom' }),
    );
  });
  it('hides presets longer than maxDays', () => {
    render(
      <TimeRangePicker
        value={{ preset: '7d', ...resolveRange('7d', NOW) }}
        onChange={() => {}}
        now={NOW}
        maxDays={7}
      />,
    );
    expect(screen.queryByRole('radio', { name: '30 days' })).not.toBeInTheDocument();
  });
  it('edits a custom range with UTC datetime inputs', () => {
    const onChange = jest.fn();
    render(
      <TimeRangePicker
        value={{
          preset: 'custom',
          from: '2026-09-01T00:00:00.000Z',
          to: '2026-09-02T00:00:00.000Z',
        }}
        onChange={onChange}
        now={NOW}
      />,
    );
    fireEvent.change(screen.getByLabelText('From (UTC)'), {
      target: { value: '2026-09-03T10:30' },
    });
    expect(onChange).toHaveBeenCalledWith({
      preset: 'custom',
      from: '2026-09-03T10:30:00.000Z',
      to: '2026-09-02T00:00:00.000Z',
    });
  });
});
