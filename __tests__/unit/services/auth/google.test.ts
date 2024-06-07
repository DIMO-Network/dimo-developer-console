import nock from 'nock';

import { GoogleAuthService } from '@/services/auth';

const {
  env: { GOOGLE_CLIENT_ID: clientId = '' },
} = process;

describe('GoogleAuthService', () => {
  it('Should redirect to oauth page', () => {
    const baseUrl = 'http://localhost:3000/';
    const googleService = new GoogleAuthService(baseUrl);

    expect(googleService.getOauthURL()).toBe(
      `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile&response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(
        baseUrl
      )}api%2Fauth%2Fcallback%2Fgoogle`
    );
  });

  it('should return expiry_date', async () => {
    const now = new Date().getTime();
    const baseUrl = 'http://localhost:3000/';
    const scope = nock('https://oauth2.googleapis.com')
      .post('/token')
      .reply(200, {
        access_token: '1234',
        refresh_token: '1234',
        expires_in: 10,
      });
    const googleService = new GoogleAuthService(baseUrl);
    const token = await googleService.processCallback('code here');
    expect(token).toHaveProperty('accessToken', '1234');
    expect(token).toHaveProperty('refreshToken', '1234');
    expect(token.expiryDate! >= now + 10 * 1000);
    expect(token.expiryDate! <= now + 15 * 1000);
    scope.done();
  });

  it('should return the suer information', async () => {
    const baseUrl = 'http://localhost:3000/';
    const googleService = new GoogleAuthService(baseUrl);
    const scopeToken = nock('https://oauth2.googleapis.com')
      .post('/token')
      .times(2)
      .reply(200, {
        access_token: '1234',
        refresh_token: '1234',
        expires_in: 10,
      });
    await googleService.processCallback('code here');
    const scopeUser = nock('https://people.googleapis.com')
      .get('/v1/people/me')
      .query({
        personFields: 'emailAddresses,names,photos',
      })
      .reply(200, {
        names: [{ unstructuredName: 'John Doe' }],
        emailAddresses: [{ value: 'johndoe@gmail.com' }],
        photos: [{ url: 'https://google.com/u/1234' }],
      });
    const user = await googleService.getUser();
    expect(user).toHaveProperty('name', 'John Doe');
    expect(user).toHaveProperty('email', 'johndoe@gmail.com');
    expect(user).toHaveProperty('avatarUrl', 'https://google.com/u/1234');
    scopeToken.done();
    scopeUser.done();
  });
});
