'use client';

import React, { ComponentType } from 'react';
import { TurnkeyProvider } from '@turnkey/sdk-react';
import { turnkeyConfig } from '@/config/turnkey';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { useAccountInformation } from '@/hooks';
import { AccountInformationModal } from '@/components/AccountInformationModal';
import { StripeCryptoContext } from '@/context/StripeCryptoContext';
import useStripeCrypto from '@/hooks/useStripeCrypto';

export const withTurnKey = <P extends object>(
  WrappedComponent: ComponentType<P>,
) => {
  const HOC: React.FC<P> = (props) => {
    const { showAccountInformation, setShowAccountInformation } =
      useAccountInformation();

    const { stripeClientId ,setStripeClientId } = useStripeCrypto();

    // Render the wrapped component with any additional props
    return (
      <TurnkeyProvider config={turnkeyConfig}>
        <AccountInformationContext.Provider
          value={{ showAccountInformation, setShowAccountInformation }}
        >
          <StripeCryptoContext.Provider value={{ stripeClientId, setStripeClientId }}>
            <WrappedComponent {...props} />
            <AccountInformationModal />
          </StripeCryptoContext.Provider>
        </AccountInformationContext.Provider>
      </TurnkeyProvider>
    );
  };

  // Set display name for the HOC component (optional but helpful for debugging)
  HOC.displayName = `withTurnKey(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withTurnKey;
