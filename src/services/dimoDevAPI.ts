import { cookies } from 'next/headers';
import axios from 'axios';

import config from '@/config';

const { NEXTAUTH_URL: nextAuthUrl = '' } = process.env;

const useSecureCookies = nextAuthUrl.startsWith('https://');
export const cookiePrefix = useSecureCookies ? '__Secure-' : '';

export const getCookie = async (cookieName: string, defaultValue = '') => {
  const nextCookies = await cookies();
  return nextCookies.get(cookieName)?.value ?? defaultValue;
};

export const dimoDevAPIClient = async (timeout: number = 5000) => {
  const tokenCookie = `${cookiePrefix}session-token`;

  const authToken = await getCookie(tokenCookie);

  const authHeader = authToken ? `Bearer ${authToken}` : undefined;

  return axios.create({
    baseURL: config.backendUrl,
    timeout,
    headers: {
      Authorization: authHeader,
    },
  });
};
