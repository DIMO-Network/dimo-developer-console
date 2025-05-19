'use client';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

import './BackButton.css';
import { FC } from 'react';

interface Props {
  onBack?: () => void;
}
export const BackButton: FC<Props> = ({ onBack }) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      return onBack();
    }
    router.back();
  };

  return (
    <div className="back-button" onClick={handleBack}>
      <ChevronLeftIcon className="w-4 h-4" />
    </div>
  );
};

export default BackButton;
