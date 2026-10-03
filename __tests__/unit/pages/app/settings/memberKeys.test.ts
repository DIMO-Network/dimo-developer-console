import {
  grantCandidates,
  memberAddresses,
  memberLicenseKeys,
} from '@/app/settings/components/Team/memberKeys';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';

const CURRENT = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';
const OLD = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d';
const LICENSES: TeamLicense[] = [
  {
    tokenId: 42,
    clientId: '0xaaa',
    label: 'Harness Fleet',
    redirectUri: 'https://x',
    signers: [CURRENT.toLowerCase()],
  },
  {
    tokenId: 43,
    clientId: '0xbbb',
    label: 'Harness Labs',
    redirectUri: 'https://y',
    signers: [OLD.toLowerCase()],
  },
  {
    tokenId: 44,
    clientId: '0xccc',
    label: 'Harness Old',
    redirectUri: null,
    signers: [],
  },
];
const SAM: TeamMember = {
  id: 'm-sam',
  userId: 'u-sam',
  name: 'Sam Rivera',
  email: 'sam@harness.dev',
  role: 'MEMBER',
  status: 'ACCEPTED',
  signerAddress: CURRENT,
  memberKeys: [
    { licenseTokenId: 42, signerAddress: CURRENT },
    { licenseTokenId: 43, signerAddress: OLD },
    { licenseTokenId: 44, signerAddress: OLD },
  ],
  invitedAt: '2026-09-01T00:00:00Z',
  inviteExpiresAt: null,
};

describe('memberLicenseKeys', () => {
  it('covers keys under an old wallet and says which are still on-chain', () => {
    expect(memberLicenseKeys(SAM, LICENSES)).toEqual([
      {
        tokenId: 42,
        licenseLabel: 'Harness Fleet',
        signer: CURRENT,
        onChain: true,
        registered: true,
        licenseKnown: true,
      },
      {
        tokenId: 43,
        licenseLabel: 'Harness Labs',
        signer: OLD,
        onChain: true,
        registered: true,
        licenseKnown: true,
      },
      {
        tokenId: 44,
        licenseLabel: 'Harness Old',
        signer: OLD,
        onChain: false,
        registered: true,
        licenseKnown: true,
      },
    ]);
  });

  it('adds the current wallet where the chain lists it without a registry row, any case', () => {
    const unregistered = {
      ...SAM,
      signerAddress: CURRENT.toLowerCase() as `0x${string}`,
      memberKeys: [],
    };
    expect(memberLicenseKeys(unregistered, LICENSES)).toEqual([
      {
        tokenId: 42,
        licenseLabel: 'Harness Fleet',
        signer: CURRENT.toLowerCase(),
        onChain: true,
        registered: false,
        licenseKnown: true,
      },
    ]);
  });

  it('marks a key whose license is not in the loaded list, so nothing reads it as off-chain', () => {
    const moved = {
      ...SAM,
      memberKeys: [{ licenseTokenId: 99, signerAddress: OLD as `0x${string}` }],
    };
    expect(memberLicenseKeys(moved, LICENSES)).toContainEqual(
      expect.objectContaining({
        tokenId: 99,
        licenseLabel: 'License #99',
        licenseKnown: false,
      }),
    );
    // Licenses still loading (or failed): every registry key is unknown.
    expect(memberLicenseKeys(SAM, []).every((k) => !k.licenseKnown)).toBe(true);
  });

  it('lists every address the member used, lowercase and unique', () => {
    expect(memberAddresses(SAM)).toEqual([CURRENT.toLowerCase(), OLD.toLowerCase()]);
  });
});

describe('grantCandidates', () => {
  it('offers licenses with a redirect URI where the current wallet has no recorded key', () => {
    // 42: recorded under CURRENT. 43: recorded only under OLD. 44: no redirect URI.
    expect(grantCandidates(SAM, LICENSES)).toEqual([
      { license: LICENSES[1], onChain: false },
    ]);
  });

  it('offers an on-chain key whose registry write failed, marked onChain', () => {
    const unrecorded = { ...SAM, memberKeys: [] };
    expect(grantCandidates(unrecorded, LICENSES)).toEqual([
      { license: LICENSES[0], onChain: true },
      { license: LICENSES[1], onChain: false },
    ]);
  });

  it('offers nothing to a member without a linked wallet, an invite or a former member', () => {
    expect(grantCandidates({ ...SAM, signerAddress: null }, LICENSES)).toEqual([]);
    expect(
      grantCandidates({ ...SAM, status: 'PENDING', userId: null }, LICENSES),
    ).toEqual([]);
    expect(grantCandidates({ ...SAM, status: 'LEFT' }, LICENSES)).toEqual([]);
  });
});
