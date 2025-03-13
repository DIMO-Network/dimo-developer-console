'use client';
import React, { type ReactNode } from 'react';

import { withNotifications } from '@/hoc';

import '@/app/globals.css';

const View = withNotifications(({ children }: { children: ReactNode }) => (
  <>{children}</>
));

export const GuestLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => <View>{children}</View>;

export default GuestLayout;
