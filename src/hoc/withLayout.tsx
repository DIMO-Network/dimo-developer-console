import React, { ComponentType, useState } from 'react';
import { LayoutContext } from '@/context/LayoutContext';

export const withLayout = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const [isFullScreenMenuOpen, setIsFullScreenMenuOpen] = useState(false);
    return (
      <LayoutContext.Provider value={{ isFullScreenMenuOpen, setIsFullScreenMenuOpen }}>
        <WrappedComponent {...props} />
      </LayoutContext.Provider>
    );
  };
  HOC.displayName = `withLayout(${WrappedComponent.displayName || WrappedComponent.name})`;
  return HOC;
};
