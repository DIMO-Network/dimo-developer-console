'use client';

import { useMemo, type ReactNode } from 'react';
import { NextIntlClientProvider, useLocale, useMessages } from 'next-intl';
import { deepMerge } from './deepMerge';

// Adds a part of the app's areas to the messages above it. The time zone and
// the rest of the config come from the provider above, the viewer's. The merge
// is deep: a section that sends one subtree of an area keeps the rest of it.
export const MergeMessages = ({
  messages,
  children,
}: {
  messages: Record<string, unknown>;
  children: ReactNode;
}) => {
  const locale = useLocale();
  const inherited = useMessages();
  const merged = useMemo(() => deepMerge(inherited, messages), [inherited, messages]);
  return (
    <NextIntlClientProvider locale={locale} messages={merged}>
      {children}
    </NextIntlClientProvider>
  );
};
