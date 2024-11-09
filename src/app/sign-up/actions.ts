'use server';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IUser } from '@/types/user';
import { Data } from '@/utils/restClient';

export const completeUserData = async (user: Partial<IUser>) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.put('/api/me/complete', user as Data);
  return data;
};
