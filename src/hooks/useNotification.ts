'use client';

import { useState } from 'react';

export type TMessageType = 'success' | 'error' | 'info';

export interface INotification {
  id: number;
  message: string;
  title: string;
  type: TMessageType;
}

export type TSetMessageFn = (
  message: string,
  title: string,
  type: TMessageType,
  duration?: number,
) => void;

export const useNotification = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);

  const setNotification: TSetMessageFn = (
    message: string,
    title: string,
    type: TMessageType,
    duration = 10000,
  ) => {
    const id = Math.floor(Math.random() * 10000); // Generate a unique ID for the notification
    const newNotification = { id, message, title, type };
    setNotifications([...notifications, newNotification]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  };

  return { notifications, setNotification };
};

export default useNotification;
