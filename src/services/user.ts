import { IUser } from '@/types/user';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export const getUserByToken = async () => {
  const client = dimoDevAPIClient();
  const { data } = await client.get<IUser>('/api/me');
  return data;
};

export const existUserByEmailOrAddress = async (
  item: string | null,
  provider: string | null
) => {
  const client = dimoDevAPIClient();
  const { data } = await client.get<{
    existItem: boolean;
    existAssociation: boolean;
  }>('/api/auth/exist', {
    params: {
      item,
      provider,
    },
  });
  return data;
};
