export interface IUser {
  id?: string;
  name: string;
  email: string;
  auth: string;
  role?: string;
  build_for?: string;
  build_for_text?: string;
  company_name?: string;
  company_website?: string;
  company_region?: string;
  company_type?: string;
  team?: string;
  crm_id?: string;
  refresh_token?: string;
  refresh_token_expiration?: Date;
  created_at?: Date;
  updated_at?: Date;
  deleted?: boolean;
  deleted_at?: Date;
}
