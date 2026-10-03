import { LocalDeveloperLicense } from '@/types/webhook';

describe('LocalDeveloperLicense', () => {
  const license = new LocalDeveloperLicense({
    alias: 'Harness Fleet',
    clientId: '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f',
    tokenId: 42,
    owner: '0x2B6E1c4f8a0d3E5b7c9a1D2E3f4A5b6c7D8e9f0a',
    redirectURIs: { nodes: [{ uri: 'https://harness.dev/callback' }] },
    signers: { nodes: [{ address: '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6' }] },
  } as never);

  it('exposes the token id and owner', () => {
    expect(license.tokenId).toBe(42);
    expect(license.owner).toBe('0x2B6E1c4f8a0d3E5b7c9a1D2E3f4A5b6c7D8e9f0a');
  });

  it('matches signers whatever the letter case', () => {
    expect(license.hasSigner('0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6')).toBe(true);
    expect(license.hasSigner('0x0000000000000000000000000000000000000001')).toBe(false);
    expect(license.hasSigner(null)).toBe(false);
  });

  it('still accepts the old three-field shape', () => {
    const old = new LocalDeveloperLicense({
      alias: 'A',
      clientId: '0xaaa',
      redirectURIs: { nodes: [{ uri: 'x' }] },
    });
    expect(old.tokenId).toBeNull();
    expect(old.hasSigner('0xaaa')).toBe(false);
  });
});
