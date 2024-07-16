import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IApp, IRedirectUri, ISigner } from '@/types/app';
import { Paginated } from '@/types/pagination';

export const createMyApp = async (workspaceId: string, app: Partial<IApp>) => {
  const client = dimoDevAPIClient();
  const { data } = await client.post<IApp>(
    `/api/my/workspace/${workspaceId}/apps`,
    app
  );
  return data;
};

export const getMyApps = async () => {
  const client = dimoDevAPIClient();
  const { data } = await client.get<Paginated<IApp>>('/api/my/apps');
  return data;
};

export const getMyApp = async (id: string) => {
  const client = dimoDevAPIClient();
  const { data } = await client.get<IApp>(`/api/my/apps/${id}`);
  return data;
};

export const createRedirectUri = async (
  id: string,
  newData: Partial<IRedirectUri>
) => {
  const client = dimoDevAPIClient();
  const { data } = await client.post<IRedirectUri>(
    `/api/my/apps/${id}/redirect-uris`,
    newData
  );
  return data;
};

export const deleteRedirectUri = async (id: string) => {
  const client = dimoDevAPIClient();
  await client.delete<IRedirectUri>(`/api/my/redirect-uris/${id}`);
};

export const updateRedirectUri = async (id: string, newData: Partial<IRedirectUri>) => {
  const client = dimoDevAPIClient();
  await client.put<IRedirectUri>(`/api/my/redirect-uris/${id}`, newData);
};

export const createSigner = async (
  id: string,
  newData: Partial<IRedirectUri>
) => {
  const client = dimoDevAPIClient();
  const { data } = await client.post<ISigner>(
    `/api/my/apps/${id}/signers`,
    newData
  );
  return data;
};

export const deleteSigner = async (id: string) => {
  const client = dimoDevAPIClient();
  await client.delete<ISigner>(`/api/my/signers/${id}`);
};
