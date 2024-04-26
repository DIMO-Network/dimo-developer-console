import { IUser } from '@/types/user';

class LoggedUser {
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

  get hasBuildForData(): boolean {
    return Boolean(this._user?.build_for);
  }

  get hasCompanyData(): boolean {
    return Boolean(this._user?.company_region);
  }

  get isCompliant(): boolean {
    return this.hasBuildForData && this.hasCompanyData;
  }

  get missingFlow(): string {
    let missingFlow = 'sign-up-with';
    if (!this.hasBuildForData) missingFlow = 'build-for';
    else if (!this.hasCompanyData) missingFlow = 'company-information';
    return missingFlow;
  }
}

export default LoggedUser;
