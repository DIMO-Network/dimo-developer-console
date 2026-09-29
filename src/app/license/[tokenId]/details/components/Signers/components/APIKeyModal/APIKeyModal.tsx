import { FC } from 'react';
import { maskStringV2 } from 'maskdata';

import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';

import './APIKeyModal.css';
import { CopyableRow } from '@/components/CopyableRow';

interface Props {
  isOpen: boolean;
  apiKey: string;
  onClose: () => void;
}

export const APIKeyModal: FC<Props> = ({ isOpen, apiKey, onClose }) => {
  const text = maskStringV2(apiKey, {
    maskWith: '*',
    unmaskedEndCharacters: 3,
    unmaskedStartCharacters: 3,
    maxMaskedCharacters: 30,
  });

  return (
    <Modal
      isOpen={isOpen}
      showClose={false}
      setIsOpen={() => null}
      className={'signer-generated-modal'}
    >
      <div className={'flex flex-col gap-12 flex-1'}>
        <Title component={'h2'} className={'text-panel-title'}>
          API key generated
        </Title>
        <div className={'flex flex-col gap-2 rounded-control bg-control px-4 py-3'}>
          <p className={'text-body-sm text-fg'}>
            Make sure to copy your API key now as you will not be able to see this again.
          </p>
          <CopyableRow
            value={apiKey}
            displayText={text}
            onCopySuccessMessage={'API key copied!'}
          />
        </div>
        <div className={'mt-4 flex flex-col flex-1 gap-4'}>
          <Button variant="primary" className="w-full" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};
