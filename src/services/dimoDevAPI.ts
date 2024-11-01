import { cookies } from 'next/headers';
import xior from 'xior';

import config from '@/config';

const { NEXTAUTH_URL: nextAuthUrl = '' } = process.env;

const useSecureCookies = nextAuthUrl.startsWith('https://');
export const cookiePrefix = useSecureCookies ? '__Secure-' : '';

export const getCookie = async (cookieName: string, defaultValue = '') => {
  const nextCookies = await cookies();
  return nextCookies.get(cookieName)?.value ?? defaultValue;
};

const addCookie = (arr: string[], cookieName: string, value: string) => {
  if (value) arr.push(`${cookieName}=${value}`);
  return arr;
};

export const dimoDevAPIClient = async (timeout: number = 5000) => {
  const invitationCookie = 'invitation';
  const tokenCookie = `${cookiePrefix}next-auth.session-token`;

  const userCookies: string[] = [];
  addCookie(userCookies, tokenCookie, await getCookie(tokenCookie));
  addCookie(userCookies, invitationCookie, await getCookie(invitationCookie));

  return xior.create({
    baseURL: config.backendUrl,
    timeout,
    headers: {
      Cookie: userCookies.join(';'),
    },
  });
};
