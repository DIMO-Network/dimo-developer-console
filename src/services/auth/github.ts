import axios, { AxiosInstance } from 'axios';

import { AuthService } from './base';

export class GitHubAuthService extends AuthService {
  private client: AxiosInstance;
  private apiClient: AxiosInstance;

  constructor() {
    const {
      env: {
        GITHUB_CLIENT_ID: clientId = '',
        GITHUB_CLIENT_SECRET: clientSecret = '',
      },
    } = process;
    super(clientId, clientSecret);

    this.client = axios.create({
      baseURL: 'https://github.com',
      headers: {
        Accept: 'application/json',
      },
    });

    this.apiClient = axios.create({
      baseURL: 'https://api.github.com',
      headers: {
        Accept: 'application/json',
      },
    });
  }

  getOauthURL() {
    return `https://github.com/login/oauth/authorize?client_id=${this.clientId}`;
  }

  async processCallback(code: string) {
    const { data } = await this.client.post('/login/oauth/access_token', {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      code,
    });
    this.apiClient.defaults.headers.common[
      'Authorization'
    ] = `Bearer ${data.access_token}`;
  }

  async getUser() {
    const { data: user } = await this.apiClient.get('/user');

    return user;
  }
}

export default GitHubAuthService;
