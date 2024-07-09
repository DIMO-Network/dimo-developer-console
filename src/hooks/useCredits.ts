'use client';

import { useState } from 'react';

export const useCredits = () => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return { isOpen, setIsOpen };
};

export default useCredits;
