'use client';
import { type FC } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/Modal';

import './LoadingModal.css';
import { BubbleLoader } from '@/components/BubbleLoader';

export interface LoadingProps {
  label?: string;
  status?: 'loading' | 'success' | 'error';
}

interface IProps extends LoadingProps {
  isOpen: boolean;
  setIsOpen: (f: boolean) => void;
}

export const LoadingModal: FC<IProps> = ({
  isOpen,
  setIsOpen,
  label = 'Processing',
  status = 'loading',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      className="loading-modal"
      showClose={status !== 'loading'}
    >
      <div className="container">
        {status === 'loading' && <BubbleLoader isLoading />}
        {status === 'success' && <CheckIcon className="h-8 w-8 text-green-400" />}
        {status === 'error' && <XMarkIcon className="h-8 w-8 text-red-400" />}
        <p className="description">{label}</p>
      </div>
    </Modal>
  );
};

export default LoadingModal;
