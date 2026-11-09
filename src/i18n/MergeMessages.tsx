'use client';

import { useMemo, type ReactNode } from 'react';
import { NextIntlClientProvider, useLocale, useMessages } from 'next-intl';

// Adds a part of the app's areas to the messages above it. The time zone and
// the rest of the config come from the provider above, the viewer's.
export const MergeMessages = ({
  messages,
  children,
}: {
  messages: Record<string, unknown>;
  children: ReactNode;
}) => {
  const locale = useLocale();
  const inherited = useMessages();
  const merged = useMemo(() => ({ ...inherited, ...messages }), [inherited, messages]);
  return (
    <NextIntlClientProvider locale={locale} messages={merged}>
      {children}
    </NextIntlClientProvider>
  );
};
