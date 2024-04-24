import axios from 'axios';

export const dimoDevAPIClient = axios.create({
  baseURL: 'http://localhost:3001/api',
});
