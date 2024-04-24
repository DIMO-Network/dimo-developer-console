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

  get isCompliant() {
    return (
      this._user &&
      this._user.company_name &&
      this._user.company_region &&
      this._user.company_website
    );
  }
}

export const loggedUser = new LoggedUSer();

export default loggedUser;
