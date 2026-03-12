'use client';
import { useState } from 'react';

export const useAccountInformation = () => {
  const [showAccountInformation, setShowAccountInformation] = useState<boolean>(false);

  return { showAccountInformation, setShowAccountInformation };
};

export default useAccountInformation;
