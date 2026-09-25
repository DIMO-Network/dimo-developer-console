'use client';

import React, { useEffect } from 'react';
import type { Metadata } from 'next';
import { dimoFont } from '@/utils/font';
import configuration from '@/config';

import '@/app/globals.css';
import QueryProvider from '@/hoc/QueryProvider';
import { useMixPanel } from '@/hooks';
import { THEME_INIT_SCRIPT } from '@/utils/theme';
import { ThemeProvider } from '@/context/ThemeContext';

export const metadata: Metadata = {
  title: configuration.appName,
  description:
    "Welcome to DIMO Developer Console - Your Ultimate Development Hub! Access powerful tools, and manage applications seamlessly. Whether you're a beginner or an expert, DIMO Developer Console provides a secure and intuitive environment to enhance your coding experience. Start exploring our advanced features and take your development to the next level today!",
};

export const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { initMixPanel } = useMixPanel();
  useEffect(() => {
    initMixPanel();
  }, []);

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={dimoFont.className}>
        <ThemeProvider>
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
