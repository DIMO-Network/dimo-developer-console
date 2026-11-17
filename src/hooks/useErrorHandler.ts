'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export const ERROR_KEYS: Record<string, string> = {
  unique_email: 'errors.emailRegistered',
  expired: 'errors.sessionExpired',
};

export const useErrorHandler = () => {
  const t = useTranslations('common');
  const searchParams = useSearchParams();
  const error = searchParams.get('error') ?? '';
  const message = error ? t(ERROR_KEYS[error] ?? 'errors.tryAgain') : null;

  useEffect(() => {
    if (message) toast.error(message);
  }, [message]);
};

export default useErrorHandler;
