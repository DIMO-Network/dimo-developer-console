'use client';

import { IGlobalAccountSession } from '@/types/wallet';
import { createContext } from 'react';

interface IProps {
  hasSession: boolean;
  checkAuthenticated: () => Promise<IGlobalAccountSession | null>;
  requestOtpLogin: (email: string) => Promise<void>;
  completeOtpLogin: (otpValidation: { otp: string; email: string }) => Promise<void>;
  loginWithPasskey: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const GlobalAccountAuthContext = createContext<IProps>({
  hasSession: false,
  checkAuthenticated: async () => null,
  requestOtpLogin: async () => {},
  completeOtpLogin: async () => {},
  loginWithPasskey: async () => {},
  logout: async () => {},
});
