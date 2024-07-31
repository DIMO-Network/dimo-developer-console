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
} from '@/services/app';
import { IApp, IRedirectUri, ISigner } from '@/types/app';

export const getAppByID = async (id: string) => {
  return getMyApp(id);
};

export const createApp = (workspaceId: string, app: Partial<IApp>) => {
  return createMyApp(workspaceId, app);
};

export const testApp = (app: IApp, signer: ISigner) => {
  return testMyApp(app, signer);
};

export const getApps = () => {
  return getMyApps();
};

export const createMyRedirectUri = (uri: string, appId: string) => {
  return createRedirectUri(appId, { uri });
};

export const deleteMyRedirectUri = (id: string) => {
  return deleteRedirectUri(id);
};

export const updateMyRedirectUri = (
  id: string,
  newData: Partial<IRedirectUri>
) => {
  return updateRedirectUri(id, newData);
};

export const createMySigner = (newData: Partial<ISigner>, appId: string) => {
  return createSigner(appId, {
    api_key: newData.api_key,
    address: newData.address,
  });
};

export const deleteMySigner = (id: string) => {
  return deleteSigner(id);
};
