'use client';
import { FC, useEffect } from 'react';
import localFont from 'next/font/local';
import classNames from 'classnames';
import * as Sentry from '@sentry/nextjs';

const euclid = localFont({
  src: [
    {
      path: './../assets/fonts/Euclid Circular A Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './../assets/fonts/Euclid Circular A Light Italic.ttf',
      weight: '300',
      style: 'italic',
    },
    {
      path: './../assets/fonts/Euclid Circular A Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './../assets/fonts/Euclid Circular A Italic.ttf',
      weight: '400',
      style: 'italic',
    },
    {
      path: './../assets/fonts/Euclid Circular A Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './../assets/fonts/Euclid Circular A Medium Italic.ttf',
      weight: '500',
      style: 'italic',
    },
    {
      path: './../assets/fonts/Euclid Circular A Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './../assets/fonts/Euclid Circular A Bold Italic.ttf',
      weight: '700',
      style: 'italic',
    },
  ],
});

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
    <html lang="en" className="h-full">
      <body className={classNames(euclid.className, 'h-full')}>
        <main className="grid min-h-full place-items-center bg-white px-6 py-24 sm:py-32 lg:px-8">
          <div className="text-center">
            <p className="text-base font-semibold text-indigo-600">404</p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Page not found
            </h1>
            <p className="mt-6 text-base leading-7 text-gray-600">
              Sorry, we couldn’t find the page you’re looking for.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href="#"
                className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Go back home
              </a>
              <button
                onClick={reset}
                className="text-sm font-semibold text-gray-900"
              >
                Re try
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
};

export default ErrorPage;
