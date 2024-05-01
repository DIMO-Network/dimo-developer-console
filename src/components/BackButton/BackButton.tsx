'use client';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

import './BackButton.css';

export const BackButton = () => {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="back-button" onClick={handleBack}>
      <ChevronLeftIcon className="w-4 h-4" />
    </div>
  );
};

export default BackButton;
