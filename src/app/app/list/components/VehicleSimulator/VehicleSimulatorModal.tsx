'use client';
import { FC, useState } from 'react';
import { Modal } from '@/components/Modal';
import { VehicleSimulator } from './index';

interface Props {
  clientId: `0x${string}`;
}

export const VehicleSimulatorModal: FC<Props> = ({ clientId }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-sm text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
      >
        ・
      </button>
      <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
        <VehicleSimulator clientId={clientId} />
      </Modal>
    </>
  );
};
