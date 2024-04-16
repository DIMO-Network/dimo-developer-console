import axios from 'axios';
import nock from 'nock';

import { GitHubAuthService } from '@/services/auth';

axios.defaults.adapter = 'http';

describe('GitHubAuthService', () => {
  it('Should redirect to oauth page', () => {
    const {
      env: { GITHUB_CLIENT_ID: clientId = '' },
    } = process;
    const githubService = new GitHubAuthService();

    expect(githubService.getOauthURL()).toBe(
      `https://github.com/login/oauth/authorize?client_id=${clientId}`
    );
  });

  it('Should authorize the login', async () => {
    const {
      env: {
        GITHUB_CLIENT_ID: clientId = '',
        GITHUB_CLIENT_SECRET: clientSecret = '',
      },
    } = process;
    const scope = nock('https://github.com')
      .post('/login/oauth/access_token', {
        client_id: clientId,
        client_secret: clientSecret,
        code: '1234',
      })
      .reply(200, {
        access_token: '1234',
        expires_in: 28800,
        refresh_token: '1234',
        refresh_token_expires_in: 15811200,
        token_type: 'bearer',
        scope: '',
      });

    const githubService = new GitHubAuthService();
    const token = await githubService.processCallback('1234');
    expect(token).toHaveProperty('accessToken', '1234');
    expect(token).toHaveProperty('refreshToken', '1234');
    expect(token).toHaveProperty('expiryDate');
    scope.done();
  });

  it('Should return the user', async () => {
    const scope = nock('https://api.github.com').get('/user').reply(200, {
      name: 'John Doe',
      email: 'johndoe@gmail.com',
      avatar_url: 'https://avatars.githubusercontent.com/u/1234',
    });

    const githubService = new GitHubAuthService();
    const user = await githubService.getUser();
    expect(user).toHaveProperty('name', 'John Doe');
    expect(user).toHaveProperty('email', 'johndoe@gmail.com');
    expect(user).toHaveProperty(
      'avatarUrl',
      'https://avatars.githubusercontent.com/u/1234'
    );
    scope.done();
  });
});
