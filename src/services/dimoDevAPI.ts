import { cookies } from 'next/headers';

import { RestClient } from '@/utils/restClient';
import { backendUrl } from '@/config/default';

export const dimoDevAPIClient = () => {
  const restClient = new RestClient(backendUrl);

  const { value: token = '' } = cookies().get('token') ?? {};
  if (token)
    restClient.defaultHeaders = {
      Authorization: `Bearer ${token}`,
    };

  return restClient;
};
