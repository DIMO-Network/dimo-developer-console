import axios, { isAxiosError } from 'axios';

import config from '@/config';

export const checkMyInvitation = async (invitationCode: string) => {
  const client = axios.create({
    baseURL: config.backendUrl,
  });
  try {
    const { data } = await client.post<{ message: string }>(
      'api/invitation/check',
      {
        invitation_code: invitationCode,
      }
    );
    return data;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      console.log({ error });
      throw new Error(error?.response?.data?.message || error?.message);
    }
  }
};
