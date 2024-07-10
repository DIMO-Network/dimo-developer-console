export interface ILicense {
  id: string;
  token_id: number;
  client_id: string;
  owner: string;
  company_id: string;
  created_at?: Date;
  updated_at?: Date;
  deleted?: boolean;
  deleted_at?: Date;
}
