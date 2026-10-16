import { AxiosError, type AxiosInstance } from 'axios';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import type {
  ApiResult,
  InvitePreview,
  LicenseSignerInput,
  LicenseSignerRecord,
  SignerProofInput,
  TeamMember,
  TeamSummary,
} from '@/types/team';

export const toFailure = (error: unknown): ApiResult<never> => {
  if (error instanceof AxiosError && error.response) {
    const body = error.response.data as { message?: string; code?: string } | undefined;
    return {
      ok: false,
      status: error.response.status,
      code: body?.code ?? null,
      message: body?.message ?? error.message,
    };
  }
  return {
    ok: false,
    status: 0,
    code: null,
    message: error instanceof Error ? error.message : 'Request failed',
  };
};

const call = async <T>(
  run: (client: AxiosInstance) => Promise<{ data: T }>,
): Promise<ApiResult<T>> => {
  try {
    const client = await dimoDevAPIClient();
    const { data } = await run(client);
    return { ok: true, data };
  } catch (error) {
    return toFailure(error);
  }
};

const noContent = async (run: (client: AxiosInstance) => Promise<unknown>) => {
  const result = await call<unknown>(async (client) => ({ data: await run(client) }));
  return result.ok ? ({ ok: true, data: null } as const) : result;
};

const id = (value: string) => encodeURIComponent(value);

export const fetchMyTeams = () =>
  call<{ teams: TeamSummary[] }>((c) => c.get('/api/my/teams'));

export const fetchTeamMembers = () =>
  call<{ members: TeamMember[] }>((c) => c.get('/api/my/team/members'));

export const postInvitation = (email: string) =>
  call<{ member: TeamMember }>((c) => c.post('/api/my/team/invitations', { email }));

export const postResendInvitation = (inviteId: string) =>
  call<{ member: TeamMember }>((c) =>
    c.post(`/api/my/team/invitations/${id(inviteId)}/resend`),
  );

export const deleteInvitation = (inviteId: string) =>
  noContent((c) => c.delete(`/api/my/team/invitations/${id(inviteId)}`));

export const postInvitePreview = (token: string) =>
  call<InvitePreview>((c) => c.post('/api/invitations/preview', { token }));

export const postAcceptInvitation = (token: string) =>
  call<{ team: TeamSummary }>((c) => c.post('/api/invitations/accept', { token }));

export const deleteTeamMember = (memberId: string) =>
  noContent((c) => c.delete(`/api/my/team/members/${id(memberId)}`));

export const postLeaveTeam = () => noContent((c) => c.post('/api/my/team/leave'));

export const putSignerProof = (input: SignerProofInput) =>
  call<{ signerAddress: `0x${string}`; signerVerifiedAt: string }>((c) =>
    c.put('/api/me/signer', input),
  );

export const fetchLicenseSigners = (tokenId: number) =>
  call<{ signers: LicenseSignerRecord[] }>((c) =>
    c.get(`/api/my/licenses/${tokenId}/signers`),
  );

export const putLicenseSigner = (
  tokenId: number,
  address: string,
  input: LicenseSignerInput,
) =>
  call<{ signer: LicenseSignerRecord }>((c) =>
    c.put(`/api/my/licenses/${tokenId}/signers/${address}`, input),
  );

export const postLicenseSignerDisabled = (tokenId: number, address: string) =>
  call<{ signer: LicenseSignerRecord }>((c) =>
    c.post(`/api/my/licenses/${tokenId}/signers/${address}/disabled`),
  );
