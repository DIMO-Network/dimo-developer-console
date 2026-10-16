import { applySignerOverlay } from '@/app/settings/components/Team/signerOverlay';
import type { TeamLicense } from '@/hooks/useTeamLicenses';

const A = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6' as const;
const B = '0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d' as const;
const license = (tokenId: number, signers: string[]): TeamLicense => ({
  tokenId,
  clientId: `0x${tokenId}`,
  label: `License ${tokenId}`,
  redirectUri: 'https://x',
  signers,
});

describe('applySignerOverlay', () => {
  it('shows a grant and a revoke this page just made before Identity indexes them', () => {
    const out = applySignerOverlay(
      [license(42, [B.toLowerCase()]), license(43, [])],
      [
        { tokenId: 42, signer: B, enabled: false, at: 1_000 },
        { tokenId: 43, signer: A, enabled: true, at: 1_000 },
      ],
      2_000,
    );
    expect(out.map((l) => l.signers)).toEqual([[], [A.toLowerCase()]]);
  });

  it('applies changes in order and drops them after a minute', () => {
    const toggles = [
      { tokenId: 42, signer: A, enabled: true, at: 0 },
      { tokenId: 42, signer: A, enabled: false, at: 10 },
    ];
    expect(applySignerOverlay([license(42, [])], toggles, 20)[0].signers).toEqual([]);
    expect(
      applySignerOverlay([license(42, [A.toLowerCase()])], toggles, 60_011)[0].signers,
    ).toEqual([A.toLowerCase()]);
  });
});
