'use client';

import { createContext } from 'react';

interface IProps {
  showAccountInformation: boolean;
  setShowAccountInformation: (f: boolean) => void;
}

export const AccountInformationContext = createContext<IProps>({
  showAccountInformation: false,
  setShowAccountInformation: () => {},
});
