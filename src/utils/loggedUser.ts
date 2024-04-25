import { IUser } from '@/types/user';

class LoggedUSer {
  public static instance: LoggedUSer | null = null;
  private _user: IUser | null = null;

  constructor() {
    if (!LoggedUSer.instance) {
      LoggedUSer.instance = this;
      this.user = null;
    }
    return this;
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
    return (
      Boolean(this._user?.company_name) &&
      Boolean(this._user?.company_region) &&
      Boolean(this._user?.company_website)
    );
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

export const loggedUser = new LoggedUSer();

export default loggedUser;
