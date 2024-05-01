import { IUser } from '@/types/user';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export const getUserByToken = async () => {
  return await dimoDevAPIClient().get<IUser>('/api/me');
};

export const updateLoggedUser = async (data: Partial<IUser>) => {
  return await dimoDevAPIClient().put<IUser>('api/me', data);
};
