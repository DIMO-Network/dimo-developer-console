'use client';
import React, { type ReactNode } from 'react';

import { dimoFont } from '@/utils/font';
import { withRainBow } from '@/hoc';

import '@/app/globals.css';
import withTurnKey from '@/hoc/TurnkeySessionProvider';

const View = withTurnKey(withRainBow(({ children }: { children: ReactNode }) => (
  <>{children}</>
)));

export const GuestLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <View>{children}</View>
);

export default GuestLayout;
