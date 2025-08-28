import { cookies } from 'next/headers';
import axios from 'axios';

import config from '@/config';

export const cookieName = 'session-token';

export const getCookie = async (cookieName: string, defaultValue = '') => {
  const nextCookies = await cookies();
  return nextCookies.get(cookieName)?.value ?? defaultValue;
};

export const dimoDevAPIClient = async (timeout: number = 5000, token?: string) => {
  console.log('🔵 Creating dimoDevAPIClient');
  console.log('🔵 Environment:', process.env.NODE_ENV);
  console.log('🔵 Vercel Environment:', process.env.VERCEL_ENV);
  console.log('🔵 Backend URL:', config.backendUrl);

  let authHeader = undefined;

  if (token) {
    console.log('🔵 Using provided token for auth');
    authHeader = `Bearer ${token}`;
  } else {
    const sessionToken = await getCookie(cookieName);
    console.log(
      '🔵 Session token from cookie:',
      sessionToken ? `${sessionToken.substring(0, 20)}...` : 'NOT FOUND',
    );

    if (sessionToken) {
      authHeader = `Bearer ${sessionToken}`;
    } else {
      console.warn('⚠️ No session token found - requests will be unauthenticated');
    }
  }

  console.log('🔵 Auth header set:', authHeader ? 'YES' : 'NO');
  console.log('🔵 Request timeout:', timeout + 'ms');

  return axios.create({
    baseURL: config.backendUrl,
    timeout,
    headers: {
      Authorization: authHeader,
    },
  });
};
