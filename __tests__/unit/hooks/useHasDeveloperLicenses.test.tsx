import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { mockIdentityApi, queryClientWrapper } from '@/utils/__fixtures__/identityApi';
import { TeamContext, type TeamContextValue } from '@/context/TeamContext';
import { useHasDeveloperLicenses } from '@/hooks/useHasDeveloperLicenses';

const OWNER = '0x2b6e1c4f8a0d3e5b7c9a1d2e3f4a5b6c7d8e9f0a' as const;

const count = (totalCount: number) => () => ({
  data: { developerLicenses: { totalCount } },
});

const setup = (
  ownerAddress: TeamContextValue['ownerAddress'],
  answer: Parameters<typeof mockIdentityApi>[0] = () => ({ data: null }),
) => {
  const identity = mockIdentityApi(answer);
  const team = { ownerAddress } as TeamContextValue;
  const { Wrapper } = queryClientWrapper();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Wrapper>
      <TeamContext.Provider value={team}>{children}</TeamContext.Provider>
    </Wrapper>
  );
  return { identity, ...renderHook(() => useHasDeveloperLicenses(), { wrapper }) };
};

describe('useHasDeveloperLicenses', () => {
  it('is unknown while there is no owner address', () => {
    const { result, identity } = setup(null);
    expect(result.current.hasDeveloperLicenses).toBeNull();
    expect(identity.requests).toEqual([]);
  });

  it('is unknown when Identity fails', async () => {
    const { result } = setup(OWNER, () => ({ status: 503 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasDeveloperLicenses).toBeNull();
    expect(result.current.error).toBeDefined();
  });

  it('is true for a count above 0', async () => {
    const { result, identity } = setup(OWNER, count(2));
    await waitFor(() => expect(result.current.hasDeveloperLicenses).toBe(true));
    expect(identity.requests[0].query).toContain('query CheckHasDeveloperLicenses');
    expect(identity.requests[0].variables).toEqual({ owner: OWNER });
  });

  it('is false for a count of 0', async () => {
    const { result } = setup(OWNER, count(0));
    await waitFor(() => expect(result.current.hasDeveloperLicenses).toBe(false));
  });
});
