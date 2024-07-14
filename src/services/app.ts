import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IApp } from '@/types/app';

export const createMyApp = async (workspaceId: string, app: Partial<IApp>) => {
  const client = dimoDevAPIClient();
  const { data } = await client.post<IApp>(
    `/api/my/workspace/${workspaceId}/apps`,
    app
  );
  return data;
};
