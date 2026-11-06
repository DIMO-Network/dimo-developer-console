import { IUser } from '@/types/user';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

// The session cookie's user, or the given token's.
export const getUserByToken = async (token?: string) => {
  const client = await dimoDevAPIClient(undefined, token);
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
