export interface ITeam {
  id?: string;
  name: string;
  company_id: string;
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
  deleted?: boolean;
  deleted_at?: Date;
}

// --- Wire types for the console-api team endpoints (contracts index C7) ---
export type TeamRole = 'OWNER' | 'MEMBER';
export type MembershipStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'LEFT';

export interface TeamSummary {
  id: string;
  name: string;
  companyName: string | null;
  role: TeamRole;
  ownerUserId: string;
  ownerEmail: string;
  ownerAddress: `0x${string}`;
  isPersonal: boolean;
}

export interface MemberKey {
  licenseTokenId: number;
  signerAddress: `0x${string}`;
}

export interface TeamMember {
  id: string;
  userId: string | null;
  name: string | null;
  email: string;
  role: TeamRole;
  status: MembershipStatus;
  signerAddress: `0x${string}` | null;
  // Every enabled MEMBER registry key this user holds in this team, whatever
  // their current signerAddress (they may have changed wallet since).
  memberKeys: MemberKey[];
  invitedAt: string;
  inviteExpiresAt: string | null;
}

export type SignerKind = 'MEMBER' | 'API_KEY' | 'EXTERNAL';

export interface LicenseSignerHolder {
  userId: string | null;
  name: string | null;
  email: string | null;
}

export interface LicenseSignerRecord {
  signerAddress: `0x${string}`;
  kind: SignerKind;
  note: string | null;
  holders: LicenseSignerHolder[];
  createdAt: string;
  createdBy: string | null;
  disabledAt: string | null;
  disabledBy: string | null;
}

export type HolderInput = { userId: string } | { name: string };

export interface LicenseSignerInput {
  kind: SignerKind;
  note?: string | null;
  holders: HolderInput[];
}

export interface LicenseAccess {
  access: 'OWNER' | 'MEMBER' | 'NONE';
  // NONE + true: a member without a key (ask the owner); NONE + false: not in the team.
  memberOfTeam: boolean;
  teamId: string | null;
  signerAddress: `0x${string}` | null;
  userEmail: string;
}

export interface InvitePreview {
  teamName: string;
  ownerEmail: string;
  expiresAt: string;
}

export interface SignerProofInput {
  address: `0x${string}`;
  message: string;
  signature: `0x${string}`;
}

// Server actions return this instead of throwing: Next replaces thrown errors
// with a generic one in production, and the UI needs the console-api code.
export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string | null; message: string };
