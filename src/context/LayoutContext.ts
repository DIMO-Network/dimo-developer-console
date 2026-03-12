import { createContext } from 'react';

interface IProps {
  isFullScreenMenuOpen: boolean;
  setIsFullScreenMenuOpen: (open: boolean) => void;
}

export const LayoutContext = createContext<IProps>({
  isFullScreenMenuOpen: false,
  setIsFullScreenMenuOpen: () => {},
});
