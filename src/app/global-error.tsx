'use client';
import { FC, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

import { Button } from '@/components/Button';
import { dimoFont } from '@/utils/font';

import '@/app/globals.css';

const DEFAULT_THEME = 'dark';

interface IProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage: FC<IProps> = ({ error, reset }) => {
  // This <html> replaces the root layout's and renders outside the providers,
  // so next-themes is not available: apply the stored theme ourselves so a
  // light user isn't stuck dark. Dark is the default.
  useEffect(() => {
    let theme = DEFAULT_THEME;
    try {
      if (window.localStorage.getItem('theme') === 'light') theme = 'light';
    } catch {
      // Storage can be blocked; keep the default.
    }
    document.documentElement.dataset.theme = theme;
  }, []);

  useEffect(() => {
    Sentry.captureException(error);
    console.error({ error });
  }, [error]);

  return (
    <html
      lang="en"
      className="h-full"
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
    >
      <body className={`${dimoFont.variable} ${dimoFont.className} h-full`}>
        <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <p className="text-label text-muted">500</p>
            <h1 className="mt-4 text-title text-ink">Something went wrong</h1>
            <p className="mt-6 text-body text-muted">
              An unexpected error occurred. Please try again.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-4">
              {/* The root layout (and so the router) may not be mounted here: a
                  plain anchor does a full navigation. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href="/" className="button primary">
                Go back home
              </a>
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
