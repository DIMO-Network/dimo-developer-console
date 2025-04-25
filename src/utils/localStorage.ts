'use client';

export const EmbeddedKey = 'GlobalAccountEmbeddedKey';
export const OtpRequested = 'requestedOtp';
export const getLocalStorageKeyForDevJWT = (clientId: string) => `devJwt_${clientId}`;

export const getDevJwt = (clientId: string) =>
  getFromLocalStorage<string>(getLocalStorageKeyForDevJWT(clientId));

export const saveToLocalStorage = <T>(key: string, value: T): void => {
  const serializedValue = JSON.stringify(value);
  localStorage.setItem(key, serializedValue);
};

export const getFromLocalStorage = <T>(key: string): T | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const serializedValue = localStorage.getItem(key);
  if (!serializedValue) {
    return null;
  }
  return JSON.parse(serializedValue);
};

export const removeFromLocalStorage = (key: string): void => {
  localStorage.removeItem(key);
};
