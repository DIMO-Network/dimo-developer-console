import { ComponentType } from 'react';

import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

import { RAINBOW_PROJECT } from '@/config/default';

import '@rainbow-me/rainbowkit/styles.css';

const config = getDefaultConfig({
  appName: RAINBOW_PROJECT.NAME,
  projectId: RAINBOW_PROJECT.ID,
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export const withRainbowKit = <P extends object>(
  WrappedComponent: ComponentType<P>
) => {
  const HOC: React.FC<P> = (props) => {
    // Render the wrapped component with any additional props
    return (
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider>
            <WrappedComponent {...props} />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    );
  };

  // Set display name for the HOC component (optional but helpful for debugging)
  HOC.displayName = `withRainbowKit(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withRainbowKit;
