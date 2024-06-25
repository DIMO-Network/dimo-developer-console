import axios from 'axios';
import { cookies } from 'next/headers';

import config from '@/config';

export const dimoDevAPIClient = (timeout: number = 5000) => {
  const nextCookies = cookies();
  const nextAuthSessionToken = nextCookies.get("next-auth.session-token");

  return axios.create({
    baseURL: config.backendUrl,
    timeout,
    withCredentials: true,
    headers: {
      Cookie: `next-auth.session-token=${nextAuthSessionToken?.value}`,
    },
  });
};
