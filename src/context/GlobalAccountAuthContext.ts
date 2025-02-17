'use client';

import { IGlobalAccountSession } from '@/types/wallet';
import { createContext } from 'react';

interface IProps {
  globalAccountSession: IGlobalAccountSession | null;
  checkAuthenticated: () => Promise<IGlobalAccountSession | null>;
  requestOtpLogin: (email: string) => Promise<void>;
  completeOtpLogin: (otpValidation: { otp: string; email: string }) => Promise<void>;
  loginWithPasskey: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const GlobalAccountAuthContext = createContext<IProps>({
  globalAccountSession: null,
  checkAuthenticated: async () => null,
  requestOtpLogin: async () => {},
  completeOtpLogin: async () => {},
  loginWithPasskey: async () => {},
  logout: async () => {},
});
