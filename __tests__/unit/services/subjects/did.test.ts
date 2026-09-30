import {
  parseErc721Did,
  isEthrDid,
  parseEthrDid,
  accountDid,
  sourceDid,
  shortDid,
  shortAddress,
} from '@/services/subjects/did';

const VEHICLE = 'did:erc721:137:0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF:184223';

describe('did helpers', () => {
  it('parses an ethr DID', () => {
    expect(
      parseEthrDid('did:ethr:80002:0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6'),
    ).toEqual({
      chainId: 80002,
      address: '0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
    });
    expect(parseEthrDid('did:ethr:80002:0x9f1e')).toBeNull();
  });

  it('parses an erc721 DID', () => {
    expect(parseErc721Did(VEHICLE)).toEqual({
      chainId: 137,
      contract: '0xbA5738a18d83D41847dfFbDC6101d37C69c9B0cF',
      tokenId: 184223,
    });
  });

  it.each(['did:ethr:137:0xabc', 'did:erc721:137:0xbA57:12', '', 'garbage'])(
    'rejects %s as an erc721 DID',
    (did) => {
      expect(parseErc721Did(did)).toBeNull();
    },
  );

  it('recognises an ethr DID', () => {
    expect(isEthrDid('did:ethr:137:0x7a3F2c1D9e8B0A4f6C5d3E2b1A0f9E8d7C6b91c2')).toBe(
      true,
    );
    expect(isEthrDid(VEHICLE)).toBe(false);
  });

  it('builds account and source DIDs', () => {
    expect(accountDid(137, '0x7a3F2c1D9e8B0A4f6C5d3E2b1A0f9E8d7C6b91c2')).toBe(
      'did:ethr:137:0x7a3F2c1D9e8B0A4f6C5d3E2b1A0f9E8d7C6b91c2',
    );
    expect(sourceDid(80002, '0xcd445F4c6bDAD32b68a2939b912150Fe3C88803E')).toBe(
      'did:ethr:80002:0xcd445F4c6bDAD32b68a2939b912150Fe3C88803E',
    );
  });

  it('shortens DIDs and addresses for display', () => {
    expect(shortDid(VEHICLE)).toBe('did:erc721:137:0xbA57…B0cF:184223');
    expect(shortDid('did:ethr:137:0x7a3F2c1D9e8B0A4f6C5d3E2b1A0f9E8d7C6b91c2')).toBe(
      'did:ethr:137:0x7a3F…91c2',
    );
    expect(shortAddress('0x7a3F2c1D9e8B0A4f6C5d3E2b1A0f9E8d7C6b91c2')).toBe(
      '0x7a3F…91c2',
    );
  });
});
