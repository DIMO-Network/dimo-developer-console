'use server';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IUser } from '@/types/user';
import { Data } from '@/utils/restClient';

export const completeUserData = (user: Partial<IUser>) => {
  return dimoDevAPIClient().put('/api/me/complete', user as Data);
};
