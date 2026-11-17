import React, { useContext } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/Button';
import { CreditsContext } from '@/context/creditsContext';

interface Props {
  className?: string;
}

const AddCreditsButton: React.FC<Props> = ({ className }) => {
  const t = useTranslations('app');
  const { setIsOpen } = useContext(CreditsContext);
  return (
    <Button variant="secondary" className={className} onClick={() => setIsOpen(true)}>
      <PlusIcon className="w-4 h-4" />
      {t('list.addCredits')}
    </Button>
  );
};
export default AddCreditsButton;
