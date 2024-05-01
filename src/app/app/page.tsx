'use client';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { PlusIcon } from '@heroicons/react/24/outline';

import { OnboardingCard } from '@/app/app/components';
import { withNotifications, withRainbowKit } from '@/hoc';

import './page.css';
import { Button } from '@/components/Button';

const HomePage = () => {
  return (
    <div className="home-page">
      <div className="welcome-message">
        <p className="title">Welcome John</p>
        <p className="sub-message">
          Learn how to get started with the DIMO API
        </p>
      </div>
      <div className="onboarding-steps">
        <OnboardingCard
          title="Connect a Wallet & Get Credits"
          description="Click the button to connect a spender wallet and start building."
          action={
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                authenticationStatus,
                mounted,
              }) => {
                // Note: If your app doesn't use authentication, you
                // can remove all 'authenticationStatus' checks
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                  ready &&
                  account &&
                  chain &&
                  (!authenticationStatus ||
                    authenticationStatus === 'authenticated');

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      style: {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <Button
                            onClick={openConnectModal}
                            className="primary w-full"
                          >
                            Connect Wallet
                          </Button>
                        );
                      }

                      if (chain.unsupported) {
                        return (
                          <Button
                            onClick={openChainModal}
                            className="primary w-full"
                          >
                            Wrong network
                          </Button>
                        );
                      }

                      return (
                        <div style={{ display: 'flex', gap: 12 }}>
                          <button
                            onClick={openChainModal}
                            style={{ display: 'flex', alignItems: 'center' }}
                            type="button"
                          >
                            {chain.hasIcon && (
                              <div
                                style={{
                                  background: chain.iconBackground,
                                  width: 12,
                                  height: 12,
                                  borderRadius: 999,
                                  overflow: 'hidden',
                                  marginRight: 4,
                                }}
                              >
                                {chain.iconUrl && (
                                  <img
                                    alt={chain.name ?? 'Chain icon'}
                                    src={chain.iconUrl}
                                    style={{ width: 12, height: 12 }}
                                  />
                                )}
                              </div>
                            )}
                            {chain.name}
                          </button>

                          <button onClick={openAccountModal} type="button">
                            {account.displayName}
                            {account.displayBalance
                              ? ` (${account.displayBalance})`
                              : ''}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          }
        />
        <OnboardingCard
          title="Create your first application"
          description="Click the button to receive your credentials and access DIMO data in minutes."
          action={
            <Button
              className="primary w-full flex flex-row gap-2 items-center"
              onClick={() => window.location.assign('/app/create')}
            >
              <span>Create app</span>
              <PlusIcon className="w-4 h-4" />
            </Button>
          }
        />
      </div>
    </div>
  );
};

export default withRainbowKit(withNotifications(HomePage));
