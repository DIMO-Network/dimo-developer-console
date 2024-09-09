'use client';

import React, { ComponentType } from 'react';
import { TurnkeyProvider } from '@turnkey/sdk-react';
import { turnkeyConfig } from '@/config/turnkey';

export const withTurnKey = <P extends object>(
  WrappedComponent: ComponentType<P>
) => {
  const HOC: React.FC<P> = (props) => {
    // Render the wrapped component with any additional props
    return (
      <TurnkeyProvider config={turnkeyConfig}>
        <WrappedComponent {...props} />
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