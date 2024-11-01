'use client';
import { FC } from 'react';
import { Metadata } from 'next';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/Button';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `404 | ${configuration.appName}`,
};

const NotFound: FC = () => {
  const router = useRouter();
  return (
    <main className="grid min-h-screen place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-base font-semibold text-white/50">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-6 text-base leading-7 text-white/20">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button onClick={() => router.replace('/app')} className="primary">
            Go back home
          </Button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;
