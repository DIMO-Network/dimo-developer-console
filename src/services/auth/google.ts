import type { Auth } from 'googleapis';

import { google } from 'googleapis';

import { AuthService } from './base';

export class GoogleAuthService extends AuthService {
  private client: Auth.OAuth2Client;
  private scopes: string[];
  constructor() {
    const {
      env: {
        GOOGLE_CLIENT_ID: clientId = '',
        GOOGLE_CLIENT_SECRET: clientSecret = '',
      },
    } = process;
    super(clientId, clientSecret);

    this.scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];
    this.client = new google.auth.OAuth2({
      clientId,
      clientSecret,
      redirectUri: 'http://localhost:3000/api/auth/callback/google',
    });
  }

  get people() {
    google.options({
      auth: this.client,
    });
    const people = google.people('v1');
    return people.people;
  }

  getOauthURL() {
    return this.client.generateAuthUrl({
      // 'online' (default) or 'offline' (gets refresh_token)
      access_type: 'offline',
      scope: this.scopes,
    });
  }

  async processCallback(code: string) {
    const { tokens } = await this.client.getToken(code);
    this.client.setCredentials(tokens);
  }
  async getUser() {
    const { data: user } = await this.people.get({
      resourceName: 'people/me',
      personFields: 'emailAddresses,names,photos',
    });

    return user;
  }
}

export default GoogleAuthService;
