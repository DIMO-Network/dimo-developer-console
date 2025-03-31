'use client';

import { createContext, Dispatch, SetStateAction } from 'react';

interface IProps {
  setUser: Dispatch<SetStateAction<{ email: string; subOrganizationId: string } | null>>;
  loginWithPasskey: (currentState: {
    currentWalletValue?: `0x${string}` | null;
  }) => Promise<{ success: boolean; newWalletAddress?: `0x${string}` }>;
  beginOtpLogin: () => Promise<string>;
  completeOtpLogin: (otp: {
    otp: string;
    otpId: string;
    currentWalletValue?: `0x${string}` | null;
  }) => Promise<{ success: boolean; newWalletAddress?: `0x${string}` }>;
  handleExternalAuth: (provider: string) => void;
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
  logout: async () => {},
});
