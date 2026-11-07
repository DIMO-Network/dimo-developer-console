'use client';
import { FC, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';

interface IProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage: FC<IProps> = ({ error, reset }) => {
  const t = useTranslations('app');
  useEffect(() => {
    Sentry.captureException(error);
    console.error({ error });
  }, [error]);

  return (
    <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-label text-muted">500</p>
        <h1 className="mt-4 text-title text-ink">{t('error.title')}</h1>
        <p className="mt-6 text-body text-muted">{t('error.description')}</p>
        <div className="mt-10 flex items-center justify-center gap-x-4">
          <Link href="/" className="button primary">
            {t('error.home')}
          </Link>
          <Button variant="secondary" onClick={reset}>
            {t('error.retry')}
          </Button>
        </div>
      </div>
    </main>
  );
};

export default ErrorPage;
