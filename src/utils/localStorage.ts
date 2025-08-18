'use client';

export const EmbeddedKey = 'GlobalAccountEmbeddedKey';
export const OtpRequested = 'requestedOtp';

export const saveToLocalStorage = <T>(key: string, value: T): void => {
  const serializedValue = JSON.stringify(value);
  localStorage.setItem(key, serializedValue);
};

export const getFromLocalStorage = <T>(key: string): T | null => {
  console.log('🔍 localStorage.getFromLocalStorage called with key:', key);
  console.log('Window available:', typeof window !== 'undefined');
  console.log('Environment type:', typeof window !== 'undefined' ? 'Browser' : 'SSR');

  if (typeof window === 'undefined') {
    console.log('❌ SSR context - returning null');
    return null;
  }

  console.log('localStorage object available:', !!window.localStorage);

  try {
    const serializedValue = localStorage.getItem(key);
    console.log(
      'Raw value from localStorage:',
      serializedValue ? 'EXISTS' : 'NULL/EMPTY',
    );
    if (serializedValue) {
      console.log('Raw value length:', serializedValue.length);
      console.log('Raw value preview:', serializedValue.substring(0, 50) + '...');
    }

    if (!serializedValue) {
      console.log('No value found for key');
      return null;
    }

    const parsed = JSON.parse(serializedValue);
    console.log('Successfully parsed JSON from localStorage');
    return parsed;
  } catch (error) {
    console.error('❌ localStorage access or JSON parsing error:', error);
    return null;
  }
};

export const removeFromLocalStorage = (key: string): void => {
  localStorage.removeItem(key);
};
