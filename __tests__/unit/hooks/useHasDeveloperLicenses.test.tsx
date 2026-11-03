import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing/react';
import { TeamContext, type TeamContextValue } from '@/context/TeamContext';
import {
  CHECK_HAS_DEVELOPER_LICENSES,
  useHasDeveloperLicenses,
} from '@/hooks/useHasDeveloperLicenses';

const OWNER = '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a' as const;

const count = (totalCount: number) => ({
  request: { query: CHECK_HAS_DEVELOPER_LICENSES, variables: { owner: OWNER } },
  result: {
    data: { developerLicenses: { __typename: 'DeveloperLicenseConnection', totalCount } },
  },
});

const setup = (ownerAddress: TeamContextValue['ownerAddress'], mocks: unknown[]) => {
  const team = { ownerAddress } as TeamContextValue;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <MockedProvider mocks={mocks as never[]}>
      <TeamContext.Provider value={team}>{children}</TeamContext.Provider>
    </MockedProvider>
  );
  return renderHook(() => useHasDeveloperLicenses(), { wrapper });
};

describe('useHasDeveloperLicenses', () => {
  it('is unknown while there is no owner address', () => {
    const { result } = setup(null, []);
    expect(result.current.hasDeveloperLicenses).toBeNull();
  });

  it('is unknown when Identity fails', async () => {
    const { result } = setup(OWNER, [
      {
        request: { query: CHECK_HAS_DEVELOPER_LICENSES, variables: { owner: OWNER } },
        error: new Error('Identity is down'),
      },
    ]);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasDeveloperLicenses).toBeNull();
    expect(result.current.error).toBeDefined();
  });

  it('is true for a count above 0', async () => {
    const { result } = setup(OWNER, [count(2)]);
    await waitFor(() => expect(result.current.hasDeveloperLicenses).toBe(true));
  });

  it('is false for a count of 0', async () => {
    const { result } = setup(OWNER, [count(0)]);
    await waitFor(() => expect(result.current.hasDeveloperLicenses).toBe(false));
  });
});
