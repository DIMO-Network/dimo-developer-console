'use client';
import { FC, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { dimoFont } from '@/utils/font';
import { THEME_INIT_SCRIPT } from '@/utils/theme';

import '@/app/globals.css';

interface IProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage: FC<IProps> = ({ error, reset }) => {
  useEffect(() => {
    Sentry.captureException(error);
    console.error({ error });
  }, [error]);

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${dimoFont.variable} ${dimoFont.className} h-full`}>
        <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <p className="text-label text-muted">404</p>
            <h1 className="mt-4 text-title text-ink">Page not found</h1>
            <p className="mt-6 text-body text-muted">
              Sorry, we couldn’t find the page you’re looking for.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-4">
              <Button onClick={() => (window.location.href = '/')}>Go back home</Button>
              <Button variant="secondary" onClick={reset}>
                Retry
              </Button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
};

export default ErrorPage;
