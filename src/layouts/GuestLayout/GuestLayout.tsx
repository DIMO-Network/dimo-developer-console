'use client';
import React, { type ReactNode } from 'react';

import { withAuth, withNotifications } from '@/hoc';

import '@/app/globals.css';

const View = withNotifications(
  withAuth(({ children }: { children: ReactNode }) => <>{children}</>),
);

export const GuestLayout = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => <View>{children}</View>;

export default GuestLayout;
