import {FC} from "react";
import {Modal} from "@/components/Modal";
import {Title} from "@/components/Title";
import {Button} from "@/components/Button";

import './DeleteConfirmationModal.css';

interface Props {
  isOpen: boolean;
  title: string;
  subtitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonClassName?: string;
}

export const DeleteConfirmationModal: FC<Props> = ({isOpen, title, subtitle, onConfirm, onCancel}) => {
  return (
    <Modal isOpen={isOpen} setIsOpen={onCancel} className={'confirmation-modal'}>
      <div className={'flex flex-col gap-4'}>
        <Title component={'h2'} className={'text-2xl !leading-8'}>{title}</Title>
        <p className={'text-text-secondary'}>{subtitle}</p>
        <div className={'mt-4 flex flex-col flex-1 gap-4'}>
          <Button className={'error w-full'} onClick={onConfirm}>
            Confirm
          </Button>
          <Button className={'w-full primary-outline'} onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

