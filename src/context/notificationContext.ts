'use client';

import { createContext } from 'react';
import { INotification } from '@/hooks/useNotification';

interface IProps {
  notifications: INotification[] | undefined;
  setNotification: (message: string, duration?: number) => void;
}

export const NotificationContext = createContext<IProps>({
  notifications: [],
  setNotification: () => {},
});
