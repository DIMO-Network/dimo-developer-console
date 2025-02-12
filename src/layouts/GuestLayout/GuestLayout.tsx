'use client';
import React, { type ReactNode } from 'react';

import { withRainBow, withGlobalAccounts, withNotifications } from '@/hoc';

import '@/app/globals.css';

const View = withNotifications(
  withRainBow(
    withGlobalAccounts(({ children }: { children: ReactNode }) => <>{children}</>),
  ),
);

export const GuestLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => <View>{children}</View>;

export default GuestLayout;
