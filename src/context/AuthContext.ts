'use client';

import { createContext, Dispatch, SetStateAction } from 'react';

interface IProps {
  setUser: Dispatch<SetStateAction<{ email: string; subOrganizationId: string } | null>>;
  loginWithPasskey: () => Promise<{ success: boolean; wallet: `0x${string}` }>;
  beginOtpLogin: () => Promise<string>;
  completeOtpLogin: (otp: {
    otp: string;
    otpId: string;
  }) => Promise<{ success: boolean; wallet: `0x${string}` }>;
  handleExternalAuth: (provider: string) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<IProps>({
  setUser: () => {},
  loginWithPasskey: async () => {
    return { success: false, wallet: '0x' };
  },
  beginOtpLogin: async () => '',
  completeOtpLogin: async () => {
    return { success: false, wallet: '0x' };
  },
  handleExternalAuth: () => {},
  logout: async () => {},
});
