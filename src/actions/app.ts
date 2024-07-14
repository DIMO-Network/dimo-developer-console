'use server';
import { appListMock } from '@/mocks/appList';
import { createMyApp } from '@/services/app';
import { IApp } from '@/types/app';

export const getAppByID = async (id: string) => {
  return appListMock[Number(id)];
};

export const createApp = (workspaceId: string, app: Partial<IApp>) => {
  return createMyApp(workspaceId, app);
};
