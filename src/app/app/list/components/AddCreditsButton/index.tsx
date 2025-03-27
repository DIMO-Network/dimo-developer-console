import React, { useContext } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import clsx from 'classnames';
import useOnboarding from '@/hooks/useOnboarding';
import { NotificationContext } from '@/context/notificationContext';

interface Props {
  className?: string;
}

const AddCreditsButton: React.FC<Props> = ({ className = 'dark with-icon' }) => {
  const { handleOpenBuyCreditsModal } = useOnboarding();
  const { setNotification } = useContext(NotificationContext);

  const handlePress = () => {
    setNotification('Test', 'test', 'success');
  };
  return (
    <Button className={clsx(className, '!h-10')} onClick={handlePress}>
      <PlusIcon className="w-4 h-4" />
      Add credits
    </Button>
  );
};
export default AddCreditsButton;
