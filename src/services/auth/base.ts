import { people_v1 } from 'googleapis';

/* eslint-disable no-unused-vars */
export abstract class AuthService {
  protected clientId: string;
  protected clientSecret: string;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  abstract getOauthURL(): string;
  abstract processCallback(c: string): Promise<void>;
  abstract getUser(): Promise<people_v1.Schema$Person | Record<string, string>>;
}
