'use client';
import React, { ComponentType } from 'react';

import { CreditsContext } from '@/context/creditsContext';
import { useCredits } from '@/hooks';
import { BuyCreditsModal } from '@/components/BuyCreditsModal';

export const withCredits = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const { isOpen, setIsOpen } = useCredits();

    // Render the wrapped component with any additional props
    return (
      <CreditsContext.Provider value={{ isOpen, setIsOpen }}>
        <WrappedComponent {...props} />
        <BuyCreditsModal />
      </CreditsContext.Provider>
    );
  };

  // Set display name for the HOC component (optional but helpful for debugging)
  HOC.displayName = `withCredits(${
    WrappedComponent.displayName || WrappedComponent.name
  })`;

  return HOC;
};

export default withCredits;
