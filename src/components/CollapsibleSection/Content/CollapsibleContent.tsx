import React, { PropsWithChildren } from 'react';
import { useCollapsible } from '@/components/CollapsibleSection/CollapsibleContext';

export const CollapsibleContent: React.FC<PropsWithChildren> = ({ children }) => {
  const { isOpen } = useCollapsible();
  if (!isOpen) return null;
  return <>{children}</>;
};
