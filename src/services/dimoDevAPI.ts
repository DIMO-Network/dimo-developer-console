import { cookies } from 'next/headers';
import axios from 'axios';

import config from '@/config';

export const cookieName = 'session-token';

export const getCookie = async (cookieName: string, defaultValue = '') => {
  const nextCookies = await cookies();
  return nextCookies.get(cookieName)?.value ?? defaultValue;
};

export const dimoDevAPIClient = async (timeout: number = 5000, token?: string) => {
  console.log('JWT SOURCE CHECK: Server-Side Cookie (Vercel)');
  console.log('Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');
  console.log('Has explicit token param:', !!token);

  let authHeader = undefined;

  if (token) {
    console.log('Using provided token parameter');
    console.log('Provided token preview:', token.substring(0, 20) + '...');
    authHeader = `Bearer ${token}`;
  } else {
    const sessionToken = await getCookie(cookieName);
    console.log('Cookie name:', cookieName);
    console.log('Session token from cookie found:', !!sessionToken);
    if (sessionToken) {
      console.log('Cookie JWT Preview:', sessionToken.substring(0, 20) + '...');
      authHeader = `Bearer ${sessionToken}`;
    } else {
      console.log('No session token in cookies');
    }
  }

  console.log('Final auth header set:', !!authHeader);
  console.log('--- End Server-Side JWT Check ---');

  return axios.create({
    baseURL: config.backendUrl,
    timeout,
    headers: {
      Authorization: authHeader,
    },
  });
};
