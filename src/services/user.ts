import { IUser } from '@/types/user';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export const getUserByToken = async () => {
  const client = await dimoDevAPIClient();
  console.info('Axios Instance', client);
  console.info("self", self);
  console.info("window", window);
  const { data } = await client.get<IUser>('/api/me');

  return data;
};

export const acceptInvitation = async (invitationCode: string) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.put<IUser>('/api/my/team/invitation', {
    invitation_code: invitationCode,
  });
  return data;
};

export const existUserByEmailOrAddress = async (
  item: string | null,
  provider: string | null,
) => {
  const client = await dimoDevAPIClient();
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
