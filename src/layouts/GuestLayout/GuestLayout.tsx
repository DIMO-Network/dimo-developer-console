import React from 'react';

import { dimoFont } from '@/utils/font';
import RainbowSessionProvider from '@/hoc/RainbowSessionProvider';

import '@/app/globals.css';

export const GuestLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="en">
    <body className={dimoFont.className}>
      <RainbowSessionProvider>{children}</RainbowSessionProvider>
    </body>
  </html>
);

export default GuestLayout;
