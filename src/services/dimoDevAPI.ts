import { cookies } from 'next/headers';
import axios from 'axios';

import config from '@/config';

export const cookieName = 'session-token';

export const getCookie = async (cookieName: string, defaultValue = '') => {
  const nextCookies = await cookies();
  return nextCookies.get(cookieName)?.value ?? defaultValue;
};

export const dimoDevAPIClient = async (timeout: number = 5000, token?: string) => {
  let authHeader = undefined;

  if (token) {
    authHeader = `Bearer ${token}`;
  } else {
    const sessionToken = await getCookie(cookieName);
    if (sessionToken) {
      authHeader = `Bearer ${sessionToken}`;
    }    
  } 

  return axios.create({
    baseURL: config.backendUrl,
    timeout,
    headers: {
      Authorization: authHeader,
    },
  });
};
