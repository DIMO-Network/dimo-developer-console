'use client';

export const saveToSession = <T>(key: string, value: T): void => {
  const serializedValue = JSON.stringify(value);
  sessionStorage.setItem(key, serializedValue);
};

export const getFromSession = <T>(key: string): T | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  const serializedValue = sessionStorage.getItem(key);
  if (!serializedValue) {
    return null;
  }
  return JSON.parse(serializedValue);
};

export const removeFromSession = (key: string): void => {
  sessionStorage.removeItem(key);
};

export const GlobalAccountSession = 'globalAccount';
