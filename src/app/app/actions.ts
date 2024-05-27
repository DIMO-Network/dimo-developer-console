'use server';
import { appListMock } from '@/mocks/appList';
import { getUserByToken } from '@/services/user';

export const getUser = async () => {
  return getUserByToken();
};

export const getAppByID = async (id: string) => {
  return appListMock[Number(id)];
};
