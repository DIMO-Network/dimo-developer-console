'use client';

import React from 'react';
import type { Metadata } from 'next';

import { dimoFont } from '@/utils/font';
import configuration from '@/config';
import { withAuth } from '@/hoc';

import '@/app/globals.css';

export const metadata: Metadata = {
  title: configuration.appName,
  description:
    "Welcome to DIMO Developer Console - Your Ultimate Development Hub! Access powerful tools, and manage applications seamlessly. Whether you're a beginner or an expert, DIMO Developer Console provides a secure and intuitive environment to enhance your coding experience. Start exploring our advanced features and take your development to the next level today!",
};

const View = withAuth(({ children }: { children: React.ReactNode }) => <>{children}</>);

export const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en">
      <body className={dimoFont.className}>
        <View>{children}</View>
      </body>
    </html>
  );
};

export default RootLayout;
