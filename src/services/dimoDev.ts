import axios from 'axios';

import { frontendUrl } from '@/config/default';

export const dimoDevClient = axios.create({
  baseURL: `${frontendUrl}api`,
});
