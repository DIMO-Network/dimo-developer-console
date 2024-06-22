import { IUser } from '@/types/user';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export const getUserByToken = async () => {
  const client = dimoDevAPIClient();
  const { data } = await client.get<IUser>('/api/me');
  return data;
};
