'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

const ERROR_CODES = {
  unique_email: 'The email is already registered',
  expired: 'The session has expired please sign in again',
};

export const useErrorHandler = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') ?? '';

  useEffect(() => {
    const message = ERROR_CODES[error as keyof typeof ERROR_CODES] ?? 'Please try again';
    if (error) {
      toast.error(message);
    }
  }, [error]);
};

export default useErrorHandler;
