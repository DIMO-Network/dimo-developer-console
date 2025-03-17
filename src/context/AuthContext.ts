'use client';

import { IGlobalAccountSession } from '@/types/wallet';
import { createContext, Dispatch, SetStateAction } from 'react';

interface IProps {
  setUser: Dispatch<SetStateAction<{ email: string; subOrganizationId: string } | null>>;
  loginWithPasskey: () => Promise<void>;
  beginOtpLogin: () => Promise<string>;
  completeOtpLogin: (otp: { otp: string; otpId: string }) => Promise<void>;
  handleExternalAuth: (provider: string) => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<IProps>({
  setUser: () => {},
  loginWithPasskey: async () => {},
  beginOtpLogin: async () => '',
  completeOtpLogin: async () => {},
  handleExternalAuth: () => {},
  logout: async () => {},
});
