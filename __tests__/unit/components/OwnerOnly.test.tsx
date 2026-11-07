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
      <OwnerOnly feature="webhooks">
        <p>webhooks table</p>
      </OwnerOnly>,
    );
    expect(screen.getByText('webhooks table')).toBeInTheDocument();
  });

  it.each([
    ['webhooks', 'Webhooks'],
    ['connections', 'Connections'],
    ['configurations', 'Configurations'],
  ] as const)('tells members who manages %s and hides the page', (feature, name) => {
    (useTeam as jest.Mock).mockReturnValue(MEMBER);
    render(
      <OwnerOnly feature={feature}>
        <p>secret page</p>
      </OwnerOnly>,
    );
    expect(screen.queryByText('secret page')).toBeNull();
    expect(
      screen.getByRole('heading', { name: `${name} are managed by the team owner` }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        `ops@acme.dev manages ${feature} for Acme Mobility. Switch to your own team to manage ${feature} for your licenses.`,
      ),
    ).toBeInTheDocument();
  });

  it('waits for the teams before deciding', () => {
    (useTeam as jest.Mock).mockReturnValue({
      isLoading: true,
      isOwner: false,
      isMember: false,
    });
    render(
      <OwnerOnly feature="connections">
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

// Owning your team doesn't make every license you can open yours: console-api
// checks the chain, so offering the action only leads to a refusal.
describe('OwnerAction for one license', () => {
  const OWNER = '0xAbCdEf000000000000000000000000000000AbCd';

  it('shows the action to the team owner whose wallet owns the license', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: true, ownerAddress: OWNER });
    render(<OwnerAction licenseOwner={OWNER.toLowerCase()}>action</OwnerAction>);
    expect(screen.getByText('action')).toBeInTheDocument();
  });

  it('hides it from a team owner whose wallet does not', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: true, ownerAddress: OWNER });
    render(
      <OwnerAction licenseOwner={`0x${'1'.repeat(40)}`} fallback="not yours">
        action
      </OwnerAction>,
    );
    expect(screen.queryByText('action')).not.toBeInTheDocument();
    expect(screen.getByText('not yours')).toBeInTheDocument();
  });
});
