'use client';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

import './BackButton.css';

export const BackButton = () => {
  const handleBack = () => {
    history.back();
  };

  return (
    <div className="back-button" onClick={handleBack}>
      <ChevronLeftIcon className="w-4 h-4" />
    </div>
  );
};

export default BackButton;
