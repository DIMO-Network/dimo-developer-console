import { IUser } from '@/types/user';

export class LoggedUser {
  public static instance: LoggedUser | null = null;
  private _user: IUser | null = null;

  constructor(user: IUser) {
    this._user = user;
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
    return this.hasTeam && this.hasPersonalData;
  }

  get missingFlow(): string {
    let missingFlow = 'sign-up-with';
    if (!this.hasPersonalData) missingFlow = 'personal-information';
    else if (!this.hasTeam) missingFlow = 'build-for';
    return missingFlow;
  }
}

export default LoggedUser;
