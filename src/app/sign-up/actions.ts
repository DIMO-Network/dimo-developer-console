'use server';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IUser } from '@/types/user';
import { Data } from '@/utils/restClient';
import { IAuth } from '@/types/auth';

export const completeUserData = async (user: Partial<IUser>, token?: string) => {
  const client = await dimoDevAPIClient(5000, token);
  const { data } = await client.put('/api/me/complete', user as Data);
  return data;
};

export const createNewUser = async (user: Partial<IAuth>, token?: string) => {
  const client = await dimoDevAPIClient(5000, token);
  const { data } = await client.post<IUser>('/api/user', user);
  return data;
};
