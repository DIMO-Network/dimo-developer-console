import { IUser } from '@/types/user';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export const getUserByToken = async () => {
  return await dimoDevAPIClient().get<IUser>('/api/me');
};
