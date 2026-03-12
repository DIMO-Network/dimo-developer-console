'use client';
import React, { type ReactNode } from 'react';

import { withAuth, withNotifications } from '@/hoc';

import './GuestLayout.css';

const Providers = withNotifications(
  withAuth(({ children }: { children: ReactNode }) => <>{children}</>),
);

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="guest-layout">
      <div className="sign-in-up-container">
        <img src={'/images/dimo-dev.svg'} alt="DIMO Developer Console Logo" />
        {children}
      </div>
      <div className="background-side-image">
        <img src={'/images/car_segment.svg'} alt="DIMO Background" />
      </div>
    </main>
  );
};

export const GuestLayout = ({
  children,
}: Readonly<{
  children: ReactNode;
}>) => (
  <Providers>
    <Layout>{children}</Layout>
  </Providers>
);

export default GuestLayout;
