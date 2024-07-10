'use client';

import { useState } from 'react';

export const useCredits = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return { isOpen, setIsOpen };
};

export default useCredits;
