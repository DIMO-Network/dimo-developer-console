'use client';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, polygonAmoy } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowKitSiweNextAuthProvider } from '@rainbow-me/rainbowkit-siwe-next-auth';
import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { AppProps } from 'next/app';
import { ReactNode } from 'react';
import { RAINBOW_PROJECT } from '@/config/default';

import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: RAINBOW_PROJECT.NAME,
  projectId: RAINBOW_PROJECT.ID,
  chains: [mainnet, polygon, polygonAmoy],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export default function RainbowSessionProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <WagmiProvider config={config}>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          <RainbowKitSiweNextAuthProvider>
            <RainbowKitProvider>{children}</RainbowKitProvider>
          </RainbowKitSiweNextAuthProvider>
        </QueryClientProvider>
      </SessionProvider>
    </WagmiProvider>
  );
}
