import { ICompany } from './company';
import { ITeam } from './team';

export interface IUser {
  id?: string;
  name: string;
  email: string;
  auth: string;
  role?: string;
  refresh_token?: string;
  refresh_token_expiration?: Date;
  team?: ITeam;
  company?: ICompany;
  created_at?: Date;
  updated_at?: Date;
  deleted?: boolean;
  deleted_at?: Date;
}
