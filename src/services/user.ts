import { IUser } from '@/types/user';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export const getUserByToken = async () => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<IUser>('/api/me');
  return data;
};

export const existUserByEmailOrAddress = async (item: string | null) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<{
    existItem: boolean;
    role: string;
    currentWallet: `0x${string}` | null;
  }>('/api/auth/exist', {
    params: {
      item,
    },
  });
  return data;
};
