import axios from 'axios';
import { cookies } from 'next/headers';

import config from '@/config';

const { NEXTAUTH_URL: nextAuthUrl = '' } = process.env;

const useSecureCookies = nextAuthUrl.startsWith('https://');
export const cookiePrefix = useSecureCookies ? '__Secure-' : '';

export const dimoDevAPIClient = (timeout: number = 5000) => {
  const nextCookies = cookies();
  const cookieName = `${cookiePrefix}next-auth.session-token`;
  const nextAuthSessionToken = nextCookies.get(cookieName);

  return axios.create({
    baseURL: config.backendUrl,
    timeout,
    withCredentials: true,
    headers: {
      Cookie: `${cookieName}=${nextAuthSessionToken?.value}`,
    },
  });
};
