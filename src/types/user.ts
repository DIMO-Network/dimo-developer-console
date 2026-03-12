import { ICompany } from './company';
import { ITeam, TeamRoles } from './team';

export interface IUser {
  id?: string;
  name: string;
  email: string;
  address?: string;
  auth: string;
  auth_login: string;
  role?: TeamRoles;
  refresh_token?: string;
  refresh_token_expiration?: Date;
  team?: ITeam;
  company?: ICompany;
  company_email_owner?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted?: boolean;
  deleted_at?: Date;
}

export interface IUserSession {
  email: string;
  subOrganizationId: string;
  walletAddress: `0x${string}`;
  smartContractAddress: `0x${string}`;
  role: TeamRoles;
}
