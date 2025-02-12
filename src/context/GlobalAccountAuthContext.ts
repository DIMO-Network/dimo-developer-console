'use client';

import { createContext } from 'react';

interface IProps {
  requestOtpLogin: (email: string) => Promise<void>;
  completeOtpLogin: (otpValidation: { otp: string; email: string }) => Promise<void>;
  loginWithPasskey: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const GlobalAccountAuthContext = createContext<IProps>({
  requestOtpLogin: async () => {},
  completeOtpLogin: async () => {},
  loginWithPasskey: async () => {},
  logout: async () => {},
});
