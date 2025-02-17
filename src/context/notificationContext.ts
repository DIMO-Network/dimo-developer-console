'use client';

import { createContext } from 'react';
import { INotification, TSetMessageFn } from '@/hooks';

interface IProps {
  notifications: INotification[] | undefined;
  setNotification: TSetMessageFn;
}

export const NotificationContext = createContext<IProps>({
  notifications: [],
  setNotification: () => {},
});
