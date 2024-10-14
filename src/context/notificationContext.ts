'use client';

import { createContext } from 'react';
import { INotification } from '@/hooks';

interface IProps {
  notifications: INotification[] | undefined;
  setNotification: (
    message: string,
    title: string,
    type: string,
    duration?: number,
  ) => void;
}

export const NotificationContext = createContext<IProps>({
  notifications: [],
  setNotification: () => {},
});
