'use client';

export const EmbeddedKey = 'GlobalAccountEmbeddedKey';
export const OtpRequested = 'requestedOtp';

export const saveToLocalStorage = <T>(key: string, value: T): void => {
  const serializedValue = JSON.stringify(value);
  localStorage.setItem(key, serializedValue);
};

export const getFromLocalStorage = <T>(key: string): T | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const serializedValue = localStorage.getItem(key);
    if (!serializedValue) {
      return null;
    }
    return JSON.parse(serializedValue);
  } catch (error) {
    console.error('❌ localStorage access or JSON parsing error:', error);
    return null;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  localStorage.removeItem(key);
};
