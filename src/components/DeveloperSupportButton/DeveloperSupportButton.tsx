import { Button } from '@/components/Button';
import { SupportAgentIcon } from '@/components/Icons';
import { FC, useState } from 'react';
import { SupportFormModal } from '@/app/settings/components/SupportFormModal';

import './DeveloperSupportButton.css';

interface IProps {
  variant?: 'small' | 'large';
}

export const DeveloperSupportButton: FC<IProps> = ({ variant = 'small' }) => {
  const [isSupportModalOpen, setIsSupportModalOpen] = useState<boolean>(false);
  const onClick = () => {
    setIsSupportModalOpen(true);
  };
  return (
    <>
      <div className="flex">
        {variant === 'small' && <QuestionMarkButton onClick={onClick} />}
        {variant === 'large' && <SupportAgentWithTextButton onClick={onClick} />}
      </div>
      <SupportFormModal isOpen={isSupportModalOpen} setIsOpen={setIsSupportModalOpen} />
    </>
  );
};

const SupportAgentWithTextButton: FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <Button className="primary-outline" onClick={onClick}>
      <SupportAgentIcon className="fill-primary h-5 w-5" color="currentColor" />
      Developer support
    </Button>
  );
};

const QuestionMarkButton: FC<{ onClick: () => void }> = ({ onClick }) => {
  return (
    <button onClick={onClick} className={'question-mark-button'}>
      <p className={'font-black text-base'}>?</p>
    </button>
  );
};
