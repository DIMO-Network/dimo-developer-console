import { buildSignerProofMessage } from '@/utils/signerProof';

describe('buildSignerProofMessage (contracts C6)', () => {
  it('is the exact three-line message with checksummed addresses', () => {
    expect(
      buildSignerProofMessage({
        eoa: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
        kernelAddress: '0x7a3c9e1f2b4d6a8c0e1f3a5b7c9d1e2f4a6b8c0d',
        issuedAt: '2026-10-02T12:00:00.000Z',
      }),
    ).toBe(
      'DIMO Developer Console\n' +
        'Link signer 0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6 to account 0x7a3C9E1f2b4d6a8C0E1f3a5B7c9d1E2F4A6B8C0d\n' +
        'Issued at 2026-10-02T12:00:00.000Z',
    );
  });
});
