import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { OwnerAction, OwnerOnly } from '@/components/OwnerOnly';

const MEMBER = {
  isLoading: false,
  isOwner: false,
  isMember: true,
  activeTeam: { name: 'Acme Mobility', ownerEmail: 'ops@acme.dev' },
};

describe('OwnerOnly', () => {
  it('renders the page for owners', () => {
    (useTeam as jest.Mock).mockReturnValue({
      isLoading: false,
      isOwner: true,
      isMember: false,
    });
    render(
      <OwnerOnly feature="Webhooks">
        <p>webhooks table</p>
      </OwnerOnly>,
    );
    expect(screen.getByText('webhooks table')).toBeInTheDocument();
  });

  it.each(['Webhooks', 'Connections', 'Configurations'])(
    'tells members who manages %s and hides the page',
    (feature) => {
      (useTeam as jest.Mock).mockReturnValue(MEMBER);
      render(
        <OwnerOnly feature={feature}>
          <p>secret page</p>
        </OwnerOnly>,
      );
      expect(screen.queryByText('secret page')).toBeNull();
      expect(
        screen.getByRole('heading', { name: `${feature} are managed by the team owner` }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          new RegExp(`ops@acme\\.dev manages ${feature.toLowerCase()} for Acme Mobility`),
        ),
      ).toBeInTheDocument();
    },
  );

  it('waits for the teams before deciding', () => {
    (useTeam as jest.Mock).mockReturnValue({
      isLoading: true,
      isOwner: false,
      isMember: false,
    });
    render(
      <OwnerOnly feature="Connections">
        <p>secret page</p>
      </OwnerOnly>,
    );
    expect(screen.queryByText('secret page')).toBeNull();
  });
});

describe('OwnerAction', () => {
  it('shows the action to owners and the fallback to members', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: true });
    const { rerender } = render(
      <OwnerAction fallback={<p>owner only</p>}>
        <button>Save</button>
      </OwnerAction>,
    );
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    (useTeam as jest.Mock).mockReturnValue({ isOwner: false });
    rerender(
      <OwnerAction fallback={<p>owner only</p>}>
        <button>Save</button>
      </OwnerAction>,
    );
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.getByText('owner only')).toBeInTheDocument();
  });
});
