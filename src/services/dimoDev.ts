import axios from 'axios';

export const dimoDevClient = axios.create({
  baseURL: `/api`,
});
