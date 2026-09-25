'use client';
import React, { type ReactNode } from 'react';

import { withAuth, withNotifications } from '@/hoc';
import { BrandLockup } from '@/components/BrandLockup';
import { ThemeToggle } from '@/components/ThemeToggle';

import './GuestLayout.css';

const Providers = withNotifications(
  withAuth(({ children }: { children: ReactNode }) => <>{children}</>),
);

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <main className="guest-layout">
      <div className="guest-theme-toggle">
        <ThemeToggle variant="icon" />
      </div>
      <div className="guest-panel">
        <BrandLockup product="Developer Console" />
        {children}
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
