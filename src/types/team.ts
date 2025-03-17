import { IUser } from './user';

export enum TeamRoles {
  OWNER = 'OWNER',
  COLLABORATOR = 'COLLABORATOR',
}

export enum TeamRolesLabels {
  OWNER = 'Owner',
  COLLABORATOR = 'Read Only',
}

export enum InvitationStatuses {
  PENDING = 'PENDING',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
}

export enum InvitationStatusLabels {
  PENDING = 'Pending',
  SENT = 'Invitation sent',
  ACCEPTED = 'Invitation accepted',
}

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

export interface ITeamCollaborator {
  [k: string]: unknown;
  id?: string;
  team_id: string;
  Team?: ITeam | undefined;
  user_id: string;
  User?: IUser | undefined;
  email?: string;
  role: string;
  status: string;
  created_at?: Date;
  updated_at?: Date;
  deleted?: boolean;
  deleted_at?: Date;
}

export interface IInvitation {
  email: string;
  role: string;
}
