import axios from 'axios';
import { DIMO } from '@dimo-network/data-sdk';
import configuration from '@/config';

export const dimoDevClient = axios.create({
  baseURL: `/api`,
  timeout: 5 * 60 * 1000,
});

const dimo = new DIMO(configuration.environment === 'production' ? 'Production' : 'Dev');

interface GetTokenParams {
  client_id: string;
  domain: string;
  private_key: string;
}

interface GetDeveloperJwtResponse {
  headers: { Authorization: `Bearer ${string}` };
}

export const getDeveloperJwt = async (
  tokenParams: GetTokenParams,
): Promise<GetDeveloperJwtResponse> => {
  return await dimo.auth.getDeveloperJwt({
    client_id: tokenParams.client_id,
    domain: tokenParams.domain,
    private_key: tokenParams.private_key,
  });
};
