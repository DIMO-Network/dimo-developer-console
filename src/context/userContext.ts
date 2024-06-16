'use client';

import { IUser } from '@/types/user';
import { createContext } from 'react';

interface IProps {
  user: IUser | undefined | null;
  setUser: (user: IUser) => void;
}

export const UserContext = createContext<IProps>({
  user: null,
  setUser: () => {},
});
