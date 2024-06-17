import { IUser } from '@/types/user';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export const getUserByToken = async () => {
  const client = dimoDevAPIClient();
  return await client.get<IUser>('/api/me');
};
