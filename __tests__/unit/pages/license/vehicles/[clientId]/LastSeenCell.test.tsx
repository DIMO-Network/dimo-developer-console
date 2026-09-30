import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { DataApiError } from '@/services/subjects/client';
import { LastSeenCell } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable/LastSeenCell';

const ASSET = 'did:erc721:80002:0x45fbCD3ef7361d156e8b16F5538AE36DEdf61Da8:7';
const cell = () => render(<LastSeenCell asset={ASSET} clientId="0xaaa" />);
const answer = (value: Record<string, unknown>) =>
  (useSubjectQuery as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    ...value,
  });

describe('LastSeenCell', () => {
  it('reads the latest status event from Fetch, not Telemetry', () => {
    answer({ data: { data: { latestIndex: null } } });
    cell();
    const call = (useSubjectQuery as jest.Mock).mock.calls.at(-1)[0];
    expect(call.api).toBe('fetch');
    expect(call.asset).toBe(ASSET);
    expect(call.request.variables).toEqual({
      did: ASSET,
      filter: { type: 'dimo.status' },
    });
  });

  it('asks for a developer JWT when none is stored', () => {
    answer({
      error: new DataApiError(0, 'DEV_JWT_MISSING', 'Generate a developer JWT'),
    });
    cell();
    const text = screen.getByText('Needs a developer JWT');
    expect(text).toHaveClass('text-muted');
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument();
  });

  it('says Unavailable for any other failure', () => {
    answer({ error: new DataApiError(403, 'NOT_SHARED', 'not shared') });
    cell();
    expect(screen.getByText('Unavailable')).toHaveClass('text-muted');
  });

  it('shows Never when the vehicle has no status event', () => {
    answer({ data: { data: { latestIndex: null } } });
    cell();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('shows the time of the latest status event', () => {
    jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
    jest.setSystemTime(new Date('2026-09-30T12:00:00Z'));
    try {
      answer({
        data: { data: { latestIndex: { header: { time: '2026-09-30T11:58:00Z' } } } },
      });
      cell();
      expect(screen.getByText('2 min ago')).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});
