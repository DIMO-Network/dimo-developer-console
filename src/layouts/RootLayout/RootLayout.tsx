'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { NextIntlClientProvider, useLocale, useMessages } from 'next-intl';
import QueryProvider from '@/hoc/QueryProvider';
import { useMixPanel } from '@/hooks/useMixPanel';
import { Toaster } from '@/components/ui/sonner';

export const RootProviders = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const { initMixPanel } = useMixPanel();
  useEffect(() => {
    initMixPanel();
  }, []);

  const locale = useLocale();
  const messages = useMessages();

  // The server's provider passes down the server's time zone (UTC on Vercel).
  // Client formatters use the viewer's, as toLocaleString() did.
  return (
    <NextIntlClientProvider
      locale={locale}
      messages={messages}
      timeZone={Intl.DateTimeFormat().resolvedOptions().timeZone}
    >
      <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
        <QueryProvider>{children}</QueryProvider>
        <Toaster position="bottom-right" />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
};

export default RootProviders;
