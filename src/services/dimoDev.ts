import axios from 'axios';

const { FRONTEND_URL } = process.env;

export const dimoDevClient = axios.create({
  baseURL: `${FRONTEND_URL}api`,
});
