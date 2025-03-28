'use client';
import React from 'react';
import { MenuButton } from '@/components/Menu/MenuButton';
import {
  withCredits,
  withNotifications,
  withGlobalAccounts,
  withApollo,
  withAccountInformation,
  withLayout,
} from '@/hoc';
import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import './AuthorizedLayout.css';
import { FullScreenMenu } from '@/components/Menu/FullScreenMenu';

const Providers = withNotifications(
  withGlobalAccounts(
    withLayout(
      withCredits(
        withApollo(
          withAccountInformation(({ children }: { children: React.ReactNode }) => (
            <>{children}</>
          )),
        ),
      ),
    ),
  ),
);

export const AuthorizedLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <Providers>
      <Layout>{children}</Layout>
    </Providers>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="main">
      <div className="sidebar-container">
        <Menu />
      </div>
      <div className="app-content">
        <div className="header-container">
          <div className="menu-header-button">
            <MenuButton />
          </div>
          <Header />
        </div>
        <FullScreenMenu />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};

export default AuthorizedLayout;
