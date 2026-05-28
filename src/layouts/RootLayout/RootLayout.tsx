'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { dimoFont } from '@/utils/font';
import '@/app/globals.css';
import QueryProvider from '@/hoc/QueryProvider';
import { useMixPanel } from '@/hooks';

export const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const { initMixPanel } = useMixPanel();
  useEffect(() => {
    initMixPanel();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={dimoFont.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
