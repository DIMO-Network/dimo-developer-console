'use server';

import {
  createMyApp,
  getMyApps,
  getMyApp,
  createRedirectUri,
  deleteRedirectUri,
  updateRedirectUri,
  createSigner,
  deleteSigner,
  testMyApp,
  deleteMyApp,
  updateMyApp,
} from '@/services/app';
import { IApp, IRedirectUri, ISigner } from '@/types/app';

export const getAppByID = async (id: string) => {
  return getMyApp(id);
};

export const createApp = async (workspaceId: string, app: Partial<IApp>) => {
  return createMyApp(workspaceId, app);
};

export const deleteApp = async (id: string) => {
  return deleteMyApp(id);
};

export const testApp = async (app: IApp, signer: ISigner) => {
  return testMyApp(app, signer);
};

export const getApps = async () => {
  return getMyApps();
};

export const createMyRedirectUri = async (uri: string, appId: string) => {
  return createRedirectUri(appId, { uri });
};

export const deleteMyRedirectUri = async (id: string) => {
  return deleteRedirectUri(id);
};

export const updateMyRedirectUri = async (id: string, newData: Partial<IRedirectUri>) => {
  return updateRedirectUri(id, newData);
};

export const createMySigner = async (newData: Partial<ISigner>, appId: string) => {
  return createSigner(appId, {
    api_key: newData.api_key,
    address: newData.address,
  });
};

export const deleteMySigner = async (id: string) => {
  return deleteSigner(id);
};

export const updateApp = async (id: string, app: Partial<IApp>) => {
  return updateMyApp(id, app);
};
