import {
  clearAllDevJwts,
  getAllDevJwts,
  getDevJwt,
  saveDevJwt,
  setMemberDevJwtSigner,
} from '@/utils/devJwt';

// jsdom: btoa, not Buffer.
const b64 = (o: object) =>
  btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
const jwt = (claims: object) =>
  `${b64({ alg: 'none' })}.${b64({ exp: Math.floor(Date.now() / 1000) + 3600, ...claims })}.sig`;
const CLIENT = '0x3e8f2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f';
const WALLET = '0x9f1e2d3c4b5A69788796A5b4c3d2E1f0a9b8C7d6';

describe('developer JWT storage', () => {
  beforeEach(() => {
    clearAllDevJwts();
    setMemberDevJwtSigner(null);
  });

  it('keeps owner JWTs in the per-license list, as before', () => {
    saveDevJwt(CLIENT, jwt({ ethereum_address: CLIENT }));
    expect(localStorage.getItem(`devJwt_${CLIENT}_list_v1`)).not.toBeNull();
    expect(getDevJwt(CLIENT)).not.toBeNull();
  });

  it("stores a member's JWTs under their wallet and returns only those their wallet signed", () => {
    setMemberDevJwtSigner(WALLET);
    const mine = jwt({ ethereum_address: CLIENT, signer_address: WALLET.toLowerCase() });
    saveDevJwt(CLIENT, mine);
    saveDevJwt(
      CLIENT,
      jwt({
        ethereum_address: CLIENT,
        signer_address: '0x0000000000000000000000000000000000000001',
      }),
    );
    saveDevJwt(CLIENT, jwt({ ethereum_address: CLIENT }));
    expect(
      localStorage.getItem(`devJwt_${CLIENT}_${WALLET.toLowerCase()}_list_v1`),
    ).not.toBeNull();
    expect(getAllDevJwts(CLIENT).map((t) => t.token)).toEqual([mine]);
  });

  it("never shows an owner's API-key JWT to a member, or a member's to the owner view", () => {
    saveDevJwt(CLIENT, jwt({ ethereum_address: CLIENT }));
    setMemberDevJwtSigner(WALLET);
    expect(getDevJwt(CLIENT)).toBeNull();
    saveDevJwt(CLIENT, jwt({ ethereum_address: CLIENT, signer_address: WALLET }));
    setMemberDevJwtSigner(null);
    expect(getAllDevJwts(CLIENT)).toHaveLength(1);
  });
});
