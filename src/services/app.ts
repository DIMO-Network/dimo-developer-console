import { eth } from 'web3';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IApp, IRedirectUri, ISigner } from '@/types/app';
import { Paginated } from '@/types/pagination';
import axios from 'axios';

export const createMyApp = async (workspaceId: string, app: Partial<IApp>) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<IApp>(`/api/my/workspace/${workspaceId}/apps`, app);
  return data;
};

export const getMyApps = async () => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<Paginated<IApp>>('/api/my/apps');
  return data;
};

export const getMyApp = async (id: string) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<IApp>(`/api/my/apps/${id}`);
  return data;
};

export const deleteMyApp = async (id: string) => {
  const client = await dimoDevAPIClient();
  await client.delete<IApp>(`/api/my/apps/${id}`);
};

export const createRedirectUri = async (id: string, newData: Partial<IRedirectUri>) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<IRedirectUri>(
    `/api/my/apps/${id}/redirect-uris`,
    newData,
  );
  return data;
};

export const deleteRedirectUri = async (id: string) => {
  const client = await dimoDevAPIClient();
  await client.delete<IRedirectUri>(`/api/my/redirect-uris/${id}`);
};

export const updateRedirectUri = async (id: string, newData: Partial<IRedirectUri>) => {
  const client = await dimoDevAPIClient();
  await client.put<IRedirectUri>(`/api/my/redirect-uris/${id}`, newData);
};

export const createSigner = async (id: string, newData: Partial<ISigner>) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<ISigner>(`/api/my/apps/${id}/signers`, newData);
  return data;
};

export const deleteSigner = async (id: string) => {
  const client = await dimoDevAPIClient();
  await client.delete<ISigner>(`/api/my/signers/${id}`);
};

export const testMyApp = async (app: IApp, signer: ISigner) => {
  const clientId = app.Workspace.client_id ?? '';
  const { uri: domain = '' } = app.RedirectUris?.find(({ deleted }) => !deleted) || {};
  const { api_key: apiKey } = signer;

  const client = axios.create({
    baseURL: process.env.DIMO_AUTH_API,
  });

  const {
    data: { state, challenge },
  } = await client.post<{
    state: string;
    challenge: string;
  }>(
    'generate_challenge',
    {},
    {
      params: {
        client_id: clientId,
        domain,
        scope: 'openid email',
        response_type: 'code',
        address: clientId,
      },
    },
  );

  const { signature } = eth.accounts.sign(challenge, apiKey);

  const { data: tokens } = await client.post(
    'submit_challenge',
    {
      client_id: clientId,
      state,
      grant_type: 'authorization_code',
      domain,
      signature,
    },
    {
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
    },
  );
  return tokens;
};
