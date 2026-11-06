'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import QueryProvider from '@/hoc/QueryProvider';
import { useMixPanel } from '@/hooks/useMixPanel';
import { Toaster } from '@/components/ui/sonner';

export const RootProviders = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const { initMixPanel } = useMixPanel();
  useEffect(() => {
    initMixPanel();
  }, []);

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
      <QueryProvider>{children}</QueryProvider>
      <Toaster position="bottom-right" />
    </ThemeProvider>
  );
};

export default RootProviders;
