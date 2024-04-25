import { RestClient } from '@/utils/restClient';
const { BACKEND_URL } = process.env;

export const dimoDevAPIClient = new RestClient(`${BACKEND_URL}api`);
