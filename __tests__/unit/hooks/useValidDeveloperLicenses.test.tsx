import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';

jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import {
  DEVELOPER_LICENSES_FOR_WEBHOOKS,
  useValidDeveloperLicenses,
} from '@/components/Webhooks/hooks/useValidDeveloperLicenses';

const ACME = '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a';
const node = (tokenId: number, uris: string[], signers: string[]) => ({
  __typename: 'DeveloperLicense',
  alias: `License ${tokenId}`,
  clientId: `0x${String(tokenId).padStart(40, '0')}`,
  tokenId,
  owner: ACME,
  redirectURIs: {
    __typename: 'RedirectURIConnection',
    nodes: uris.map((uri) => ({ __typename: 'RedirectURI', uri })),
  },
  signers: {
    __typename: 'SignerConnection',
    nodes: signers.map((address) => ({ __typename: 'Signer', address })),
  },
});
const mocks = [
  {
    request: { query: DEVELOPER_LICENSES_FOR_WEBHOOKS, variables: { owner: ACME } },
    result: {
      data: {
        developerLicenses: {
          __typename: 'DeveloperLicenseConnection',
          nodes: [node(42, ['https://x'], ['0xABC']), node(43, [], [])],
        },
      },
    },
  },
];
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MockedProvider mocks={mocks}>{children}</MockedProvider>
);

describe('useValidDeveloperLicenses', () => {
  it("queries the active team owner's licenses", async () => {
    (useTeam as jest.Mock).mockReturnValue({ ownerAddress: ACME });
    const { result } = renderHook(() => useValidDeveloperLicenses(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.developerLicenses.map((l) => l.tokenId)).toEqual([42]);
    expect(result.current.developerLicenses[0].hasSigner('0xabc')).toBe(true);
  });

  it('stays loading until the team owner is known', () => {
    (useTeam as jest.Mock).mockReturnValue({ ownerAddress: null });
    const { result } = renderHook(() => useValidDeveloperLicenses(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.developerLicenses).toEqual([]);
  });
});
