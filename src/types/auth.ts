import { ICompany } from './company';

export interface IAuth {
  name: string;
  email: string;
  company?: ICompany;
  message?: string;
  signature?: `0x${string}`;
}
