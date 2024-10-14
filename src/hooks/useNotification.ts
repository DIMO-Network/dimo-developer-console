'use client';

import { useState } from 'react';

export interface INotification {
  id: number;
  message: string;
  title: string;
  type: string;
}

export const useNotification = () => {
  const [notifications, setNotifications] = useState<INotification[]>([]);

  const setNotification = (
    message: string,
    title: string,
    type: string,
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
