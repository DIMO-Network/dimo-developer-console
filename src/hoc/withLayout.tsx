import React, { ComponentType, useEffect, useState } from 'react';
import { LayoutContext } from '@/context/LayoutContext';

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export const withLayout = <P extends object>(WrappedComponent: ComponentType<P>) => {
  const HOC: React.FC<P> = (props) => {
    const [isFullScreenMenuOpen, setIsFullScreenMenuOpen] = useState(false);
    const [isSidebarCollapsed, setSidebarCollapsedState] = useState(false);

    useEffect(() => {
      const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === 'true') setSidebarCollapsedState(true);
    }, []);

    const setSidebarCollapsed = (collapsed: boolean) => {
      setSidebarCollapsedState(collapsed);
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    };

    return (
      <LayoutContext.Provider
        value={{
          isFullScreenMenuOpen,
          setIsFullScreenMenuOpen,
          isSidebarCollapsed,
          setSidebarCollapsed,
        }}
      >
        <WrappedComponent {...props} />
      </LayoutContext.Provider>
    );
  };

  HOC.displayName = `withLayout(${WrappedComponent.displayName || WrappedComponent.name})`;
  return HOC;
};
