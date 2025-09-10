import { createContext, useContext } from 'react';

type CollapsibleContextType = {
  isOpen: boolean;
  toggle: () => void;
};

export const CollapsibleContext = createContext<CollapsibleContextType | null>(null);

export function useCollapsible() {
  const ctx = useContext(CollapsibleContext);
  if (!ctx) {
    throw new Error('Collapsible subcomponents must be used inside <CollapsibleSection>');
  }
  return ctx;
}
