'use server';

import * as api from '@/services/teams';
import type { LicenseSignerInput, SignerProofInput } from '@/types/team';

// Thin server actions: the browser never holds the session token, so every
// console-api call goes through here with the session cookie and X-Team-Id.
// Invite preview and acceptance live in @/actions/invites (they read the
// HttpOnly invite cookie).
export const listMyTeams = async () => api.fetchMyTeams();
export const listTeamMembers = async () => api.fetchTeamMembers();
export const inviteTeamMember = async (email: string) => api.postInvitation(email);
export const resendTeamInvite = async (inviteId: string) =>
  api.postResendInvitation(inviteId);
export const cancelTeamInvite = async (inviteId: string) =>
  api.deleteInvitation(inviteId);
export const removeTeamMember = async (memberId: string) =>
  api.deleteTeamMember(memberId);
export const leaveTeam = async () => api.postLeaveTeam();
export const registerSigner = async (input: SignerProofInput) =>
  api.putSignerProof(input);
export const listLicenseSigners = async (tokenId: number) =>
  api.fetchLicenseSigners(tokenId);
export const upsertLicenseSigner = async (
  tokenId: number,
  address: string,
  input: LicenseSignerInput,
) => api.putLicenseSigner(tokenId, address, input);
export const markLicenseSignerDisabled = async (tokenId: number, address: string) =>
  api.postLicenseSignerDisabled(tokenId, address);
