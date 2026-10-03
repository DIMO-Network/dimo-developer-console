import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/gql', () => ({
  gql: (s: TemplateStringsArray) => s,
  useFragment: (_def: unknown, data: unknown) => data,
}));
jest.mock('@/components/LicenseCard', () => ({
  LicenseCard: () => <div data-testid="license-card" />,
}));
jest.mock('@/app/app/list/components/CreateAppButton', () => ({
  __esModule: true,
  default: () => <button>Create a license</button>,
}));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { LicenseList } from '@/app/license/list/LicenseList';

describe('LicenseList', () => {
  it('lets owners create licenses', () => {
    (useTeam as jest.Mock).mockReturnValue({
      isMember: false,
      activeTeam: { name: 'Harness Motors' },
    });
    render(<LicenseList licenseConnection={{ nodes: [{}] } as never} />);
    expect(screen.getByText('Your developer licenses')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a license' })).toBeInTheDocument();
  });

  it("shows members the team's licenses without a create button", () => {
    (useTeam as jest.Mock).mockReturnValue({
      isMember: true,
      activeTeam: { name: 'Acme Mobility' },
    });
    render(<LicenseList licenseConnection={{ nodes: [] } as never} />);
    expect(screen.getByText('Acme Mobility licenses')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create a license' })).toBeNull();
    expect(
      screen.getByText('This team has no developer licenses yet'),
    ).toBeInTheDocument();
  });
});
