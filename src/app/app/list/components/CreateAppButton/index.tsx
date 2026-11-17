import React from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/Button';
import { CreateAppModal } from '@/components/CreateAppModal';

interface Props {
  className?: string;
  disabled?: boolean;
}

const CreateAppButton: React.FC<Props> = ({ className, disabled }) => {
  const t = useTranslations('app');
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
        {t('list.createLicense')}
      </Button>
    </>
  );
};
export default CreateAppButton;
