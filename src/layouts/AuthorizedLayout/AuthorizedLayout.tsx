'use client';
import React, {useState} from 'react';

import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import {
  withCredits,
  withNotifications,
  withNextSession,
  withGlobalAccounts,
} from '@/hoc';

import './AuthorizedLayout.css';
import FullScreenMenu from "../../components/Menu/FullScreenMenu";

export const AuthorizedLayout = withNextSession(
  withNotifications(
    withGlobalAccounts(
      withCredits(
         ({
          children,
        }: Readonly<{
          children: React.ReactNode;
        }>) => {
          return (
            <div className="main">
              <div className="sidebar-container">
                <Menu />
              </div>
              <div className="app-content">
                <div className="flex flex-row items-center justify-items-stretch">
                  <FullScreenMenu />
                  <Header />
                </div>
                <main className="page-content">{children}</main>
              </div>
            </div>
          );
        },
      ),
    ),
  ),
);

export default AuthorizedLayout;
