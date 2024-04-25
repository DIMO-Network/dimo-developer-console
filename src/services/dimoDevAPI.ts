import { RestClient } from '@/utils/restClient';
import { backendUrl } from '@/config/default';

export const dimoDevAPIClient = new RestClient(backendUrl);
