import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Button';
import { CreateAppModal } from '@/components/CreateAppModal';

interface Props {
  className?: string;
  disabled?: boolean;
}

const CreateAppButton: React.FC<Props> = ({ className, disabled }) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  return (
    <>
      <CreateAppModal isOpen={isModalOpen} handleIsOpen={setIsModalOpen} />
      <Button
        className={className}
        onClick={() => setIsModalOpen(true)}
        disabled={disabled}
      >
        <PlusIcon className="w-4 h-4" />
        Create a license
      </Button>
    </>
  );
};
export default CreateAppButton;
