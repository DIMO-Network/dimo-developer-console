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