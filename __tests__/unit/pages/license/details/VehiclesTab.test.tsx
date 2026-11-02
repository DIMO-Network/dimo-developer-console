import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/gql', () => ({
  gql: (s: TemplateStringsArray) => s,
  useFragment: (_def: unknown, data: unknown) => data,
}));
jest.mock('@apollo/client/react', () => ({
  ...jest.requireActual('@apollo/client/react'),
  useQuery: () => ({ data: { vehicles: { totalCount: 6 } }, loading: false }),
}));
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/app/app/list/components/VehicleSimulator/VehicleSimulatorModal', () => ({
  VehicleSimulatorModal: () => <button>Vehicle simulator</button>,
}));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { Vehicles } from '@/app/license/[tokenId]/details/components/Vehicles/Vehicles';

const licenseOwnedBy = (owner: string) =>
  ({ clientId: '0xaaa', tokenId: 42, owner }) as never;

describe('license Vehicles tab', () => {
  it("doesn't offer members the simulator, which mints from their own wallet", () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: false, ownerAddress: '0xabc' });
    render(<Vehicles license={licenseOwnedBy('0xabc')} />);
    expect(screen.getByRole('button', { name: 'Vehicle list' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vehicle simulator' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Configure sharing' })).toBeNull();
  });

  it('keeps both for owners', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: true, ownerAddress: '0xAbC' });
    render(<Vehicles license={licenseOwnedBy('0xabc')} />);
    expect(screen.getByRole('button', { name: 'Vehicle simulator' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configure sharing' })).toBeInTheDocument();
  });

  it('offers no simulator or sharing setup on a license another wallet owns', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: true, ownerAddress: '0xabc' });
    render(<Vehicles license={licenseOwnedBy('0xother')} />);
    expect(screen.getByRole('button', { name: 'Vehicle list' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vehicle simulator' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Configure sharing' })).toBeNull();
  });
});
