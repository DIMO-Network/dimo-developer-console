import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PendingGrantBanner } from '@/app/settings/components/Team/PendingGrantBanner';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const SIGNER = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const SAM: TeamMember = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: SIGNER,
  memberKeys: [],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};
const LICENSE: TeamLicense = {
  tokenId: 42,
  clientId: '0xaaa',
  label: 'Harness Fleet',
  redirectUri: 'https://x',
  signers: [],
};
const LABS: TeamLicense = {
  tokenId: 43,
  clientId: '0xbbb',
  label: 'Harness Labs',
  redirectUri: 'https://y',
  signers: [],
};
const onGrant = jest.fn();
const show = (members: TeamMember[], licenses = [LICENSE], licensesLoading = false) =>
  render(
    <PendingGrantBanner
      members={members}
      licenses={licenses}
      licensesLoading={licensesLoading}
      onGrant={onGrant}
    />,
  );

describe('PendingGrantBanner', () => {
  it('asks the owner to grant a member whose wallet is missing from a license', () => {
    show([SAM]);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Sam Rivera joined. Grant data access?',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }));
    expect(onGrant).toHaveBeenCalledWith(SAM);
  });

  it('still asks when the member has some licenses but not all', () => {
    show(
      [{ ...SAM, memberKeys: [{ licenseTokenId: 42, signerAddress: SIGNER }] }],
      [LICENSE, LABS],
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('waits for the licenses to load', () => {
    show([SAM], [], true);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('stays hidden for a member with every license, without a wallet, or with nothing grantable', () => {
    show([{ ...SAM, memberKeys: [{ licenseTokenId: 42, signerAddress: SIGNER }] }]);
    expect(screen.queryByRole('status')).toBeNull();
    show([{ ...SAM, signerAddress: null }]);
    expect(screen.queryByRole('status')).toBeNull();
    show([SAM], [{ ...LICENSE, redirectUri: null }]);
    expect(screen.queryByRole('status')).toBeNull();
  });
});
