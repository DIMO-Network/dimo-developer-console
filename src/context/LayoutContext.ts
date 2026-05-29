import { createContext } from 'react';

interface ILayoutContext {
  isFullScreenMenuOpen: boolean;
  setIsFullScreenMenuOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const LayoutContext = createContext<ILayoutContext>({
  isFullScreenMenuOpen: false,
  setIsFullScreenMenuOpen: () => {},
  isSidebarCollapsed: false,
  setSidebarCollapsed: () => {},
});
