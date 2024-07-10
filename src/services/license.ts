import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { ILicense } from '@/types/license';

export const getMyLicense = async () => {
  const client = dimoDevAPIClient();
  const { data } = await client.get<ILicense>('/api/my/license');
  return data;
};
