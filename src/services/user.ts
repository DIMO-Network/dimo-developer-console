import { IUser } from '@/types/user';
import { dimoDevAPIClient, getCookie } from '@/services/dimoDevAPI';

export const getUserByToken = async () => {
  const client = await dimoDevAPIClient();

  const invitationCode = await getCookie('invitation_code');
  const { data } = await client.get<IUser>(
    `/api/me${invitationCode ? `?invitation_code=${invitationCode}` : ''}`,
  );

  return data;
};

export const acceptInvitation = async (invitationCode: string) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.put<IUser>('/api/my/team/invitation', {
    invitation_code: invitationCode,
  });
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
