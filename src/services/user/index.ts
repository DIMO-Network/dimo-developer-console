import { IUser } from '@/types/user';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export const getUserByToken = async (token: string) => {
  // Using fetch since middlewares do not use http adapter so, it blocks axios
  dimoDevAPIClient.defaultHeaders = {
    Authorization: `Bearer ${token}`,
  };
  return await dimoDevAPIClient.get<IUser>('api/me', {});
};
