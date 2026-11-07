'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

const ERROR_KEYS: Record<string, string> = {
  unique_email: 'errors.emailRegistered',
  expired: 'errors.sessionExpired',
};

export const useErrorHandler = () => {
  const t = useTranslations('common');
  const searchParams = useSearchParams();
  const error = searchParams.get('error') ?? '';

  useEffect(() => {
    if (error) {
      toast.error(t(ERROR_KEYS[error] ?? 'errors.tryAgain'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);
};

export default useErrorHandler;
