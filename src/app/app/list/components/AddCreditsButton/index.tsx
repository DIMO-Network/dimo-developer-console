import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import clsx from 'classnames';
import useOnboarding from '@/hooks/useOnboarding';

interface Props {
  className?: string;
}

const AddCreditsButton: React.FC<Props> = ({ className = 'dark with-icon' }) => {
  const { handleOpenBuyCreditsModal } = useOnboarding();
  return (
    <Button className={clsx(className, '!h-10')} onClick={handleOpenBuyCreditsModal}>
      <PlusIcon className="w-4 h-4" />
      Add credits
    </Button>
  );
};
export default AddCreditsButton;
