import { getFromLocalStorage, saveToLocalStorage } from '@/utils/localStorage';

const getKey = (clientId: string) => `devJwt_${clientId}`;

export const saveDevJwt = (clientId: string, token: string) => {
  return saveToLocalStorage(getKey(clientId), token);
};

export const getDevJwt = (clientId: string) =>
  getFromLocalStorage<string>(getKey(clientId));
