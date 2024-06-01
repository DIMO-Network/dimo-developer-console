'use server';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IUser } from '@/types/user';

export const completeUserData = (user: Partial<IUser>) => {
  return dimoDevAPIClient().put('/api/me/complete', user);
};
