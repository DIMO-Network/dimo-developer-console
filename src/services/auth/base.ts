export interface IUser {
  name: string;
  email: string;
  avatarUrl: string;
}

export interface IToken {
  accessToken: string;
  refreshToken: string | null;
  expiryDate: number;
}

/* eslint-disable no-unused-vars */
export abstract class AuthService {
  protected clientId: string;
  protected clientSecret: string;
  protected baseUrl: string;

  constructor(clientId: string, clientSecret: string, baseUrl: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.baseUrl = baseUrl;
  }

  abstract getOauthURL(): string;
  abstract processCallback(c: string): Promise<IToken>;
  abstract getUser(): Promise<IUser>;
}
