'use client';

import { createContext } from 'react';

interface IProps {
  isOpen: boolean;
  setIsOpen: (f: boolean) => void;
}

export const CreditsContext = createContext<IProps>({
  isOpen: false,
  setIsOpen: () => {},
});
