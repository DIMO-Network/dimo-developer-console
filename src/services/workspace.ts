import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IWorkspace } from '@/types/workspace';

export const getMyWorkspace = async () => {
  const client = dimoDevAPIClient();
  const { data } = await client.get<IWorkspace>('/api/my/workspace');
  return data;
};

export const createMyWorkspace = async (workspace: IWorkspace) => {
  const client = dimoDevAPIClient();
  const { data } = await client.post<IWorkspace>('/api/my/workspace', workspace);
  return data;
};
