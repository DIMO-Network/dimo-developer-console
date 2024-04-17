import axios from 'axios';

export const dimoDevClient = axios.create({
  baseURL: 'http://localhost:3000/api',
});
