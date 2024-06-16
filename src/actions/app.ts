'use server';
import { appListMock } from '@/mocks/appList';

export const getAppByID = async (id: string) => {
  return appListMock[Number(id)];
};
