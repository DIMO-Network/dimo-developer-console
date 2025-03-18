'use client';

import { IUserSession } from '@/types/user';
import { createContext } from 'react';

interface IProps {
  validateCurrentSession: () => Promise<IUserSession | null>;
  currentUser: IUserSession | null;
  getCurrentDimoBalance: () => Promise<number>;
  getCurrentDcxBalance: () => Promise<number>;
  logout: () => Promise<void>;
}

export const GlobalAccountContext = createContext<IProps>({
  validateCurrentSession: async () => null,
  currentUser: null,
  getCurrentDimoBalance: async () => 0,
  getCurrentDcxBalance: async () => 0,
  logout: async () => {},
});
