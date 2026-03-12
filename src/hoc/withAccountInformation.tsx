import React, { ComponentType } from 'react';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { useAccountInformation } from '@/hooks';
import { AccountInformationModal } from '@/components/AccountInformationModal';

export const withAccountInformation = <P extends object>(
  WrappedComponent: ComponentType<P>,
) => {
  const HOC: React.FC<P> = (props) => {
    const { showAccountInformation, setShowAccountInformation } = useAccountInformation();
    return (
      <AccountInformationContext.Provider
        value={{ showAccountInformation, setShowAccountInformation }}
      >
        <WrappedComponent {...props} />
        <AccountInformationModal />
      </AccountInformationContext.Provider>
    );
  };
  HOC.displayName = `withAccountInformation(${WrappedComponent.displayName || WrappedComponent.name})`;
  return HOC;
};
