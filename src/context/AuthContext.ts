'use client';

import { createContext, Dispatch, SetStateAction } from 'react';

interface IProps {
  setUser: Dispatch<SetStateAction<{ email: string; subOrganizationId: string } | null>>;
  loginWithPasskey: (currentState: {
    currentWalletValue?: `0x${string}` | null;
    existOnDevConsole: boolean;
  }) => Promise<{ success: boolean; newWalletAddress?: `0x${string}` }>;
  beginOtpLogin: () => Promise<string>;
  completeOtpLogin: (otp: {
    otp: string;
    otpId: string;
    currentWalletValue?: `0x${string}` | null;
    existOnDevConsole: boolean;
  }) => Promise<{ success: boolean; newWalletAddress?: `0x${string}` }>;
  handleExternalAuth: (provider: string) => void;
  completeExternalAuth: (code: string) => Promise<{ success: boolean; email: string }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<IProps>({
  setUser: () => {},
  loginWithPasskey: async () => {
    return { success: false };
  },
  beginOtpLogin: async () => '',
  completeOtpLogin: async () => {
    return { success: false };
  },
  handleExternalAuth: () => {},
  completeExternalAuth: async () => {
    return { success: false, email: '' };
  },
  logout: async () => {},
});
