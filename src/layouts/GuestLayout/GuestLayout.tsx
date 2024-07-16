'use client';
import React, { type ReactNode } from 'react';

import { dimoFont } from '@/utils/font';
import { withRainBow } from '@/hoc';

import '@/app/globals.css';

const View = withRainBow(({ children }: { children: ReactNode }) => (
  <>{children}</>
));

export const GuestLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="en">
    <body className={dimoFont.className}>
      <View>{children}</View>
    </body>
  </html>
);

export default GuestLayout;
