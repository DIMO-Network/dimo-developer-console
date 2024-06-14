import { cookies } from 'next/headers';

import { RestClient } from '@/utils/restClient';
import config from '@/config';

export const dimoDevAPIClient = () => {
  const restClient = new RestClient(config.backendUrl);

  const { value: token = '' } = cookies().get('token') ?? {};
  if (token)
    restClient.defaultHeaders = {
      Authorization: `Bearer ${token}`,
    };

  return restClient;
};
