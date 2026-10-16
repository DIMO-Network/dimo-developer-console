/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { inviteRedirect } from '@/utils/inviteCookie';

const TOKEN = 'Qm9vdHN0cmFwX3Rva2VuX2Zvcl90ZXN0aW5nXzEyMzQ1Ng';

describe('inviteRedirect', () => {
  it('keeps a well-formed token in an HttpOnly cookie and strips it from the URL', () => {
    const res = inviteRedirect(
      new NextRequest(
        `http://console.test/sign-in?invite=${TOKEN}&focus=rentals_os_signup`,
      ),
    )!;
    expect(res.status).toBe(307);
    const location = new URL(res.headers.get('location')!);
    expect(location.pathname).toBe('/sign-in');
    expect(location.searchParams.get('invite')).toBeNull();
    expect(location.searchParams.get('focus')).toBe('rentals_os_signup');
    const cookie = res.cookies.get('invite_token')!;
    expect(cookie.value).toBe(TOKEN);
    expect(cookie).toMatchObject({
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 86400,
    });
    expect(cookie.secure).toBeFalsy();
  });

  it('marks the cookie Secure on https', () => {
    const res = inviteRedirect(
      new NextRequest(`https://console.test/sign-in?invite=${TOKEN}`),
    )!;
    expect(res.cookies.get('invite_token')?.secure).toBe(true);
  });

  it('strips a malformed token without storing it', () => {
    const res = inviteRedirect(
      new NextRequest('http://console.test/sign-in?invite=a%3Cb'),
    )!;
    expect(res.status).toBe(307);
    expect(res.cookies.get('invite_token')).toBeUndefined();
  });

  it('ignores every path but /sign-in, and /sign-in without the parameter', () => {
    expect(
      inviteRedirect(new NextRequest(`http://console.test/app?invite=${TOKEN}`)),
    ).toBeNull();
    expect(inviteRedirect(new NextRequest('http://console.test/sign-in'))).toBeNull();
  });
});
