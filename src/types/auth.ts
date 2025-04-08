import { ICompany } from './company';

export interface IAuth {
  name: string;
  email: string;
  address?: string;
  auth: string;
  auth_login: string;
  company?: ICompany;
  message?: string;
  signature?: `0x${string}`;
  isPasskey?: boolean;
}
