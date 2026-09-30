import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/subjects/useSubjectQuery', () => ({ useSubjectQuery: jest.fn() }));
import { useSubjectQuery } from '@/hooks/subjects/useSubjectQuery';
import { DataApiError } from '@/services/subjects/client';
import { LastSeenCell } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable/LastSeenCell';

const cell = () =>
  render(<LastSeenCell tokenId={7} asset="did:erc721:80002:0xabc:7" clientId="0xaaa" />);
const answer = (value: Record<string, unknown>) =>
  (useSubjectQuery as jest.Mock).mockReturnValue({
    data: undefined,
    isLoading: false,
    error: null,
    ...value,
  });

describe('LastSeenCell', () => {
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

  it('shows the last-seen time once loaded', () => {
    answer({ data: { data: { signalsLatest: { lastSeen: null } } } });
    cell();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });
});
