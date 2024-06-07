import { google, people_v1, type Auth } from 'googleapis';
import _ from 'lodash';

import { frontendUrl } from '@/config/default';
import { AuthService, type IUser, type IToken } from './base';
const {
  env: {
    GOOGLE_CLIENT_ID: clientId = '',
    GOOGLE_CLIENT_SECRET: clientSecret = '',
  },
} = process;

export class GoogleAuthService extends AuthService {

  private client: Auth.OAuth2Client;
  private scopes: string[];
  constructor(baseUrl: string) {
    super(clientId, clientSecret, baseUrl);

    this.scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ];
    this.client = new google.auth.OAuth2({
      clientId,
      clientSecret,
      redirectUri: `${this.baseUrl}api/auth/callback/google`,
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

  static transformTokenData(token = {}): IToken {
    const today = new Date();
    return {
      accessToken: _.get(token, 'access_token', ''),
      refreshToken: _.get(token, 'refresh_token', null),
      expiryDate: _.get(token, 'expiry_date', today.getTime()),
    };
  }

  async processCallback(code: string) {
    const { tokens: token } = await this.client.getToken(code);
    this.client.setCredentials(token);

    return GoogleAuthService.transformTokenData(token);
  }

  static transformUserData(user: people_v1.Schema$Person): IUser {
    return {
      name: _.get(user, 'names.0.unstructuredName', ''),
      email: _.get(user, 'emailAddresses.0.value', ''),
      avatarUrl: _.get(user, 'photos.0.url', ''),
    };
  }

  async getUser() {
    const { data: user } = await this.people.get({
      resourceName: 'people/me',
      personFields: 'emailAddresses,names,photos',
    });

    return GoogleAuthService.transformUserData(user);
  }
}

export default GoogleAuthService;
