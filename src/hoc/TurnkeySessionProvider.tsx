'use client';

import React, { ComponentType } from 'react';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { useAccountInformation } from '@/hooks';
import { AccountInformationModal } from '@/components/AccountInformationModal';

export const withTurnKey = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const { showAccountInformation, setShowAccountInformation } = useAccountInformation();

    // Render the wrapped component with any additional props
    return (
      <AccountInformationContext.Provider
        value={{ showAccountInformation, setShowAccountInformation }}
      >
        <WrappedComponent {...props} />
        <AccountInformationModal />
      </AccountInformationContext.Provider>
    );
  };

  // Set display name for the HOC component (optional but helpful for debugging)
  HOC.displayName = `withTurnKey(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withTurnKey;
