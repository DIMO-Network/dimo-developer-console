'use client';
import {IGlobalAccountSession} from "@/types/wallet";

export const GlobalAccountSession = 'globalAccount';

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

export const isLicenseOwner = (license: { owner: string }) => {
  const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
  const organizationInfo = gaSession?.organization;
  return !!(organizationInfo?.smartContractAddress && organizationInfo.smartContractAddress === license.owner);
};
