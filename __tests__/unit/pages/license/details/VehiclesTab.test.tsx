import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/gql', () => ({
  gql: (s: TemplateStringsArray) => s,
  useFragment: (_def: unknown, data: unknown) => data,
}));
jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: () => ({ data: { vehicles: { totalCount: 6 } }, loading: false }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/app/app/list/components/VehicleSimulator/VehicleSimulatorModal', () => ({
  VehicleSimulatorModal: () => <button>Vehicle simulator</button>,
}));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { Vehicles } from '@/app/license/[tokenId]/details/components/Vehicles/Vehicles';

const LICENSE = { clientId: '0xaaa', tokenId: 42 } as never;

describe('license Vehicles tab', () => {
  it("doesn't offer members the simulator, which mints from their own wallet", () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: false });
    render(<Vehicles license={LICENSE} />);
    expect(screen.getByRole('button', { name: 'Vehicle list' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vehicle simulator' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Configure sharing' })).toBeNull();
  });

  it('keeps both for owners', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: true });
    render(<Vehicles license={LICENSE} />);
    expect(screen.getByRole('button', { name: 'Vehicle simulator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configure sharing' })).toBeInTheDocument();
  });
});
