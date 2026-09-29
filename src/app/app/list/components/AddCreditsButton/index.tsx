import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import useOnboarding from '@/hooks/useOnboarding';

interface Props {
  className?: string;
}

const AddCreditsButton: React.FC<Props> = ({ className }) => {
  const { handleOpenBuyCreditsModal } = useOnboarding();
  return (
    <Button variant="secondary" className={className} onClick={handleOpenBuyCreditsModal}>
      <PlusIcon className="w-4 h-4" />
      Add credits
    </Button>
  );
};
export default AddCreditsButton;
