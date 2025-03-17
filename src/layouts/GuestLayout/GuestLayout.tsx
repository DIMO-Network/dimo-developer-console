'use client';
import React, { type ReactNode } from 'react';

import { withAuth, withNotifications } from '@/hoc';

import '@/app/globals.css';

const View = withNotifications(
  withAuth(({ children }: { children: React.ReactNode }) => <>{children}</>),
);

export const GuestLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => <View>{children}</View>;

export default GuestLayout;
