'use client';
import React, { type ReactNode } from 'react';

import { withRainBow } from '@/hoc';

import '@/app/globals.css';
import withTurnKey from '@/hoc/TurnkeySessionProvider';

const View = withRainBow(
  withTurnKey(({ children }: { children: ReactNode }) => <>{children}</>),
);

export const GuestLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => <View>{children}</View>;

export default GuestLayout;
