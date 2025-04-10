import axios from 'axios';

export const dimoDevClient = axios.create({
  baseURL: `/api`,
  timeout: 5 * 60 * 1000,
});
