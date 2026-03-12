import { isCollaborator } from './user';
import { ISubOrganization } from '@/types/wallet';
import { IUser } from '@/types/user';

export class LoggedUser {
  public static instance: LoggedUser | null = null;
  private _user: IUser | null = null;
  private _subOrganization: ISubOrganization | null = null;

  constructor(user: IUser, turnkeyData: ISubOrganization) {
    this._user = user;
    this._subOrganization = turnkeyData;
  }

  set user(user: IUser | null) {
    this._user = user;
  }

  get user(): IUser | null {
    return this._user;
  }

  get hasPersonalData(): boolean {
    return Boolean(this._user?.email && this._user?.name);
  }

  get hasTeam(): boolean {
    return Boolean(this._user?.team);
  }

  get isCompliant(): boolean {
    return this.hasTeam && this.hasPersonalData && this.isGlobalAccountUser;
  }

  get isGlobalAccountUser(): boolean {
    if (isCollaborator(this._user?.role ?? '')) return true;
    return Boolean(this._subOrganization?.subOrganizationId);
  }

  get hasPasskey(): boolean {
    return this._subOrganization?.hasPasskey ?? false;
  }

  get missingFlow(): string {
    let missingFlow = '';
    if (!this.isGlobalAccountUser) missingFlow = 'wallet-creation';
    else if (!this.hasTeam) missingFlow = 'build-for';
    return missingFlow;
  }
}

export default LoggedUser;
