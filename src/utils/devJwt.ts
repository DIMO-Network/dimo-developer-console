import {
  getFromLocalStorage,
  saveToLocalStorage,
  removeFromLocalStorage,
} from '@/utils/localStorage';
import { jwtDecode } from 'jwt-decode';

const getKey = (clientId: string) => `devJwt_${clientId}_list_v1`;

export interface StoredJwt {
  token: string;
  createdAt: number;
}

export const saveDevJwt = (clientId: string, token: string) => {
  const key = getKey(clientId);
  const existingTokens = getFromLocalStorage<StoredJwt[]>(key) || [];

  // Add new token with creation timestamp
  const newToken: StoredJwt = {
    token,
    createdAt: Date.now(),
  };

  return saveToLocalStorage(key, [...existingTokens, newToken]);
};

const getValidTokens = (clientId: string): StoredJwt[] => {
  const key = getKey(clientId);
  const tokens = getFromLocalStorage<StoredJwt[]>(key) || [];

  const now = Date.now();
  const validTokens = tokens.filter((storedJwt) => {
    try {
      const decoded = jwtDecode(storedJwt.token);
      const exp = decoded.exp ? decoded.exp * 1000 : null;
      return exp ? now <= exp : true;
    } catch {
      return false;
    }
  });

  return validTokens.sort((a, b) => b.createdAt - a.createdAt);
};

export const getDevJwt = (clientId: string) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const validTokens = getValidTokens(clientId);
  return validTokens.length ? validTokens[0].token : null;
};

export const getAllDevJwts = (clientId: string) => {
  return getValidTokens(clientId);
};

export const removeDevJwt = (clientId: string, tokenToRemove: string) => {
  const key = getKey(clientId);
  const tokens = getFromLocalStorage<StoredJwt[]>(key);
  if (!tokens) return;

  const remainingTokens = tokens.filter(({ token }) => token !== tokenToRemove);

  if (remainingTokens.length === 0) {
    removeFromLocalStorage(key);
  } else {
    saveToLocalStorage(key, remainingTokens);
  }
};
