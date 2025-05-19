import {
  getFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
} from '@/utils/localStorage';
import { jwtDecode } from 'jwt-decode';

const getKey = (clientId: string) => `devJwt_${clientId}`;

export const saveDevJwt = (clientId: string, token: string) => {
  return saveToLocalStorage(getKey(clientId), token);
};

export const getDevJwt = (clientId: string) => {
  const token = getFromLocalStorage<string>(getKey(clientId));
  if (!token) return null;
  try {
    const { exp } = jwtDecode(token);
    const now = Math.floor(Date.now() / 1000);
    if (!exp || exp < now) {
      removeFromLocalStorage(getKey(clientId));
      return null;
    }
    return token;
  } catch {
    return null;
  }
};
