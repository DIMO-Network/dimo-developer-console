import React from 'react';
import { render, screen } from '@testing-library/react';
import { FreshnessDot } from '@/components/FreshnessDot';

const NOW = Date.parse('2026-09-29T20:49:00Z');

describe('FreshnessDot', () => {
  it('shows a live dot and relative time for recent data', () => {
    render(<FreshnessDot at="2026-09-29T20:47:00Z" now={NOW} />);
    expect(screen.getByText('2 min ago')).toBeInTheDocument();
    expect(screen.getByTestId('freshness-dot')).toHaveAttribute('data-freshness', 'live');
  });
  it('shows Never with a muted dot when there is no data', () => {
    render(<FreshnessDot at={null} now={NOW} />);
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByTestId('freshness-dot')).toHaveAttribute('data-freshness', 'none');
  });
  it('can render the dot alone', () => {
    render(<FreshnessDot at="2026-09-28T00:00:00Z" now={NOW} label={false} />);
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
    expect(screen.getByTestId('freshness-dot')).toHaveAttribute(
      'data-freshness',
      'inactive',
    );
  });
});
