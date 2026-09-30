import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

const useQuery = jest.fn();
jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: (...args: unknown[]) => useQuery(...args),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/actions/simulatedVehicles', () => ({
  getSimulatedVehicles: jest.fn().mockResolvedValue([]),
}));
jest.mock('@/hooks/useRenounceVehiclePermissions', () => ({
  useRenounceVehiclePermissions: () => ({ renounce: jest.fn() }),
}));
jest.mock('@/hooks/subjects/useSubjectQuery', () => ({
  useSubjectQuery: () => ({ isLoading: false, error: null, data: null }),
}));
import { VehicleDetailsTable } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable';

const vehicle = (sacd: unknown) => ({
  tokenId: 7,
  tokenDID: 'did:erc721:1:0xabc:7',
  definition: { make: 'Tesla', model: 'Model 3', year: 2022 },
  aftermarketDevice: null,
  syntheticDevice: null,
  sacd,
});

const mockSingle = (single: Record<string, unknown>) =>
  useQuery.mockImplementation((_doc, opts) =>
    opts?.skip
      ? { data: undefined, loading: false, error: undefined, refetch: jest.fn() }
      : { refetch: jest.fn(), loading: false, error: undefined, ...single },
  );

describe('VehicleDetailsTable token ID search', () => {
  beforeEach(() => useQuery.mockReset());

  it('says the vehicle is not shared when it has no permissions for the license', () => {
    mockSingle({ data: { vehicle: vehicle(null) } });
    render(<VehicleDetailsTable clientId="0xaaa" tokenIdSearch={7} />);
    expect(screen.getByText(/isn't shared with this license/)).toBeInTheDocument();
  });

  it('shows a lookup error instead of "not found"', () => {
    mockSingle({ error: new Error('boom') });
    render(<VehicleDetailsTable clientId="0xaaa" tokenIdSearch={7} />);
    expect(screen.getByText(/Couldn't look up vehicle 7: boom/)).toBeInTheDocument();
    expect(screen.queryByText(/No vehicle has token ID/)).toBeNull();
  });

  it('opens the renounce modal from the row menu of a shared vehicle', () => {
    mockSingle({ data: { vehicle: vehicle({ permissions: '0x1' }) } });
    render(<VehicleDetailsTable clientId="0xaaa" tokenIdSearch={7} />);
    fireEvent.click(screen.getByLabelText('Row actions'));
    fireEvent.click(screen.getByText('Renounce access'));
    expect(screen.getByText('Token ID: 7')).toBeInTheDocument();
  });
});
