import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@/actions/teams', () => ({ listTeamMembers: jest.fn() }));
jest.mock('@/hooks/useTeam', () => ({
  useTeam: () => ({ activeTeam: { id: 'team-harness' }, isLoading: false }),
}));
import { listTeamMembers } from '@/actions/teams';
import { mergeMember, useTeamMembers } from '@/hooks/useTeamMembers';
import { TeamApiError } from '@/utils/teamApiError';
import type { TeamMember } from '@/types/team';

const member = (id: string, email: string): TeamMember => ({
  id,
  userId: null,
  name: null,
  email,
  role: 'MEMBER',
  status: 'PENDING',
  signerAddress: null,
  memberKeys: [],
  invitedAt: '2026-10-01T00:00:00Z',
  inviteExpiresAt: '2026-10-08T00:00:00Z',
});
const makeWrapper = () => {
  const client = new QueryClient();
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useTeamMembers', () => {
  it('loads the members and upserts one in place', async () => {
    (listTeamMembers as jest.Mock).mockResolvedValue({
      ok: true,
      data: { members: [member('m-1', 'a@harness.dev')] },
    });
    const { result } = renderHook(() => useTeamMembers(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.members).toHaveLength(1));
    result.current.upsertMember(member('m-2', 'b@harness.dev'));
    await waitFor(() =>
      expect(result.current.members.map((m) => m.id)).toEqual(['m-1', 'm-2']),
    );
  });

  it('fails with a TeamApiError so TeamProvider can see NOT_A_MEMBER', async () => {
    (listTeamMembers as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'NOT_A_MEMBER',
      message: 'Not a member',
    });
    const { result } = renderHook(() => useTeamMembers(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(TeamApiError);
    expect((result.current.error as TeamApiError).code).toBe('NOT_A_MEMBER');
  });

  it('mergeMember replaces by id and appends new members', () => {
    const list = [member('m-1', 'a@harness.dev')];
    expect(mergeMember(list, { ...list[0], status: 'ACCEPTED' })[0].status).toBe(
      'ACCEPTED',
    );
    expect(mergeMember(list, member('m-2', 'b@harness.dev'))).toHaveLength(2);
  });
});
