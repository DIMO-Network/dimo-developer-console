import { IUser } from '@/types/user';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export const getUserByToken = async () => {
  const client = dimoDevAPIClient();
  const { data } = await client.get<IUser>('/api/me');
  return data;
};

export const existUserByAddress = async (address: string | null) => {
  const client = dimoDevAPIClient();
  const { data } = await client.get<{ exist: boolean }>('/api/auth/exist', {
    params: {
      address,
    },
  });
  return data;
};
