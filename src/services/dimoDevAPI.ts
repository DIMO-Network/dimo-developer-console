import axios from 'axios';
import { cookies } from 'next/headers';

import config from '@/config';

const { NEXTAUTH_URL: nextAuthUrl = '' } = process.env;

const useSecureCookies = nextAuthUrl.startsWith('https://');
export const cookiePrefix = useSecureCookies ? '__Secure-' : '';

export const getCookie = (cookieName: string, defaultValue = '') => {
  const nextCookies = cookies();
  return nextCookies.get(cookieName)?.value ?? defaultValue;
};

const addCookie = (arr: string[], cookieName: string, value: string) => {
  if (value) arr.push(`${cookieName}=${value}`);
  return arr;
};

export const dimoDevAPIClient = (timeout: number = 5000) => {
  const invitationCookie = 'invitation';
  const tokenCookie = `${cookiePrefix}next-auth.session-token`;

  const userCookies: string[] = [];
  addCookie(userCookies, tokenCookie, getCookie(tokenCookie));
  addCookie(userCookies, invitationCookie, getCookie(invitationCookie));

  return axios.create({
    baseURL: config.backendUrl,
    timeout,
    headers: {
      Cookie: userCookies.join(';'),
    },
  });
};
