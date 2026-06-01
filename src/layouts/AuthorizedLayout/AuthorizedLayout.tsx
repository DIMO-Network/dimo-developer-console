'use client';
import React, { useContext } from 'react';
import { MenuButton } from '@/components/Menu/MenuButton';
import {
  withCredits,
  withGlobalAccounts,
  withApollo,
  withAccountInformation,
  withLayout,
} from '@/hoc';
import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import { FullScreenMenu } from '@/components/Menu/FullScreenMenu';
import { LayoutContext } from '@/context/LayoutContext';
import { cn } from '@/lib/utils';
import './AuthorizedLayout.css';

const Providers = withGlobalAccounts(
  withLayout(
    withCredits(
      withApollo(
        withAccountInformation(({ children }: { children: React.ReactNode }) => (
          <>{children}</>
        )),
      ),
    ),
  ),
);

export const AuthorizedLayout = ({
  children,
}: Readonly<{ children: React.ReactNode }>) => {
  return (
    <Providers>
      <Layout>{children}</Layout>
    </Providers>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarCollapsed } = useContext(LayoutContext);

  return (
    <div className="main">
      <div
        className={cn('sidebar-container', isSidebarCollapsed ? 'collapsed' : 'expanded')}
      >
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
