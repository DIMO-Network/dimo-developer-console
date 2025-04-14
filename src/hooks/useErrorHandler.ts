'use client';

import { useContext, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import { NotificationContext } from '@/context/notificationContext';

const ERROR_CODES = {
  unique_email: 'The email is already registered',
  expired: 'The session has expired please sign in again',
};

export const useErrorHandler = () => {
  const { setNotification } = useContext(NotificationContext);
  const searchParams = useSearchParams();
  const error = searchParams.get('error') ?? '';

  useEffect(() => {
    const message = ERROR_CODES[error as keyof typeof ERROR_CODES] ?? 'Please try again';
    if (error) {
      setNotification(message, 'Oops...', 'error');
    }
  }, [error]);
};

export default useErrorHandler;
