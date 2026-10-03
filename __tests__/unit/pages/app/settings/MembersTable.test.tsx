import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MembersTable } from '@/app/settings/components/Team/MembersTable';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const SAM_WALLET = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const OLD_WALLET = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d';
const base = {
  userId: null,
  name: null,
  role: 'MEMBER' as const,
  signerAddress: null,
  memberKeys: [],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const MEMBERS: TeamMember[] = [
  {
    ...base,
    id: 'm-owner',
    userId: 'u-jane',
    name: 'Jane Harness',
    email: 'jane@harness.dev',
    role: 'OWNER',
    status: 'ACCEPTED',
  },
  {
    ...base,
    id: 'm-sam',
    userId: 'u-sam',
    name: 'Sam Rivera',
    email: 'sam@harness.dev',
    status: 'ACCEPTED',
    signerAddress: SAM_WALLET,
    memberKeys: [{ licenseTokenId: 42, signerAddress: SAM_WALLET }],
  },
  {
    ...base,
    id: 'm-ana',
    email: 'ana@harness.dev',
    status: 'PENDING',
    inviteExpiresAt: '2099-01-01T00:00:00Z',
  },
  {
    ...base,
    id: 'm-leo',
    userId: 'u-leo',
    name: 'Leo Park',
    email: 'leo@harness.dev',
    status: 'LEFT',
    memberKeys: [{ licenseTokenId: 42, signerAddress: OLD_WALLET }],
  },
];
const LICENSES: TeamLicense[] = [
  {
    tokenId: 42,
    clientId: '0xaaa',
    label: 'Harness Fleet',
    redirectUri: 'https://x',
    signers: [SAM_WALLET.toLowerCase()],
  },
  {
    tokenId: 43,
    clientId: '0xbbb',
    label: 'Harness Labs',
    redirectUri: 'https://y',
    signers: [],
  },
];
const handlers = {
  grant: jest.fn(),
  revoke: jest.fn(),
  remove: jest.fn(),
  resend: jest.fn(),
  cancel: jest.fn(),
};
const show = (props: Partial<React.ComponentProps<typeof MembersTable>> = {}) =>
  render(
    <MembersTable
      members={MEMBERS}
      licenses={LICENSES}
      isOwner
      showDataAccess
      handlers={handlers}
      {...props}
    />,
  );
const menu = (email: string) => {
  fireEvent.click(screen.getByRole('button', { name: `Actions for ${email}` }));
  return within(screen.getByRole('menu'))
    .getAllByRole('menuitem')
    .map((i) => i.textContent);
};

describe('MembersTable', () => {
  it('shows each status with a status chip, LEFT like REVOKED', () => {
    show();
    expect(screen.getAllByText('Active')).toHaveLength(2);
    expect(screen.getByText('Invited')).toBeInTheDocument();
    expect(screen.getByText('Left')).toBeInTheDocument();
  });

  it('shows data access per member, and an unfinished revoke for a key left in the registry', () => {
    show();
    expect(screen.getByText('Harness Fleet')).toBeInTheDocument();
    expect(screen.getByText('Revoke unfinished')).toBeInTheDocument();
  });

  it('hides the Data access column and Grant while the flag is off (C5)', () => {
    show({ showDataAccess: false });
    expect(screen.queryByRole('columnheader', { name: 'Data access' })).toBeNull();
    expect(menu('sam@harness.dev')).toEqual(['Revoke', 'Remove']);
  });

  it('collapses row actions into one ⋯ menu and hides low-priority columns on phones', () => {
    show();
    expect(screen.getByRole('columnheader', { name: 'Role' })).toHaveClass(
      'hidden',
      'md:table-cell',
    );
    expect(screen.getByRole('columnheader', { name: 'Data access' })).toHaveClass(
      'hidden',
      'md:table-cell',
    );
    expect(
      screen.queryByRole('button', { name: 'Actions for jane@harness.dev' }),
    ).toBeNull();
    expect(menu('sam@harness.dev')).toEqual(['Grant', 'Revoke', 'Remove']);
  });

  it('offers resend and cancel for an invite, and revoking for a member who left', () => {
    show();
    expect(menu('ana@harness.dev')).toEqual(['Resend', 'Cancel invite']);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Resend' }));
    expect(handlers.resend).toHaveBeenCalledWith(MEMBERS[2]);
    expect(menu('leo@harness.dev')).toEqual(['Revoke']);
  });

  it("shows a removed member who is still a signer, with Retry, and a member who hasn't linked a wallet", () => {
    show({
      members: [
        {
          ...MEMBERS[3],
          id: 'm-rex',
          email: 'rex@harness.dev',
          status: 'REVOKED',
          memberKeys: [{ licenseTokenId: 42, signerAddress: SAM_WALLET }],
        },
        {
          ...MEMBERS[1],
          id: 'm-new',
          email: 'new@harness.dev',
          signerAddress: null,
          memberKeys: [],
        },
      ],
    });
    expect(screen.getByText('Still a signer on Harness Fleet')).toBeInTheDocument();
    expect(screen.getByText('Needs to sign in once')).toBeInTheDocument();
    expect(menu('rex@harness.dev')).toEqual(['Retry']);
  });

  it('gives members no actions', () => {
    show({ isOwner: false, showDataAccess: false, handlers: undefined });
    expect(screen.queryByRole('button', { name: /^Actions for/ })).toBeNull();
  });
});
