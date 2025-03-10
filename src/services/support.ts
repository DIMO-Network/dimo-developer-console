import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { ISupportRequest } from '@/types/support';

export const sendSupportEmail = async (supportRequest: ISupportRequest) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post('/api/my/support/email', supportRequest);
  return data;
};
