'use client';

import { IGlobalAccountSession } from '@/types/wallet';
import { createContext, Dispatch, SetStateAction } from 'react';

interface IProps {
  getUserDetails: (email: string) => Promise<IGlobalAccountSession | null>;
  setUser: Dispatch<SetStateAction<Partial<IGlobalAccountSession> | null>>;
  loginWithPasskey: () => Promise<void>;
  beginOtpLogin: () => Promise<string>;
  completeOtpLogin: (otp: { otp: string; otpId: string }) => Promise<void>;
  logout: () => Promise<void>;
  handleExternalAuth: (provider: string) => void;
}

export const AuthContext = createContext<IProps>({
  setUser: () => {},
  getUserDetails: async () => null,
  loginWithPasskey: async () => {},
  beginOtpLogin: async () => '',
  completeOtpLogin: async () => {},
  logout: async () => {},
  handleExternalAuth: () => {},
});
