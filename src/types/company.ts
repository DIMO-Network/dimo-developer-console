export interface ICompany {
  id?: string;
  name: string;
  website?: string;
  region: string;
  type: string;
  build_for: string;
  build_for_text?: string;
  crm_id?: string;
  created_at?: Date;
  updated_at?: Date;
  deleted?: boolean;
  deleted_at?: Date;
}
