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
  const tokens = getFromLocalStorage<StoredJwt[]>(getKey(clientId));
  if (!tokens || !tokens.length) return [];

  const now = Math.floor(Date.now() / 1000);
  const validTokens = tokens.filter(({ token }) => {
    try {
      const { exp } = jwtDecode(token);
      return exp && exp > now;
    } catch {
      return false;
    }
  });

  // If no valid tokens remain, remove all tokens
  if (!validTokens.length) {
    removeFromLocalStorage(getKey(clientId));
    return [];
  }

  // Update storage with only valid tokens
  if (validTokens.length !== tokens.length) {
    saveToLocalStorage(getKey(clientId), validTokens);
  }

  return validTokens.sort((a, b) => b.createdAt - a.createdAt);
};

export const getDevJwt = (clientId: string) => {
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
