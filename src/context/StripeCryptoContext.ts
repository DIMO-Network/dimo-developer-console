'use client';
import {createContext} from 'react';

interface IProps {
 stripeClientId: string | null;
 setStripeClientId: (f: string) => void;
}

export const StripeCryptoContext = createContext<IProps>({
  stripeClientId: null,
  setStripeClientId: () => {},
});