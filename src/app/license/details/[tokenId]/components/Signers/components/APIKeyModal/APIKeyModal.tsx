import { FC, useContext } from 'react';
import { maskStringV2 } from 'maskdata';

import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { ContentCopyIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';

import './APIKeyModal.css';

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
        <Title component={'h2'} className={'text-2xl !leading-8'}>
          API key generated
        </Title>
        <div
          className={
            'bg-feedback-success bg-opacity-50 py-3 px-4 rounded-xl flex flex-col gap-2'
          }
        >
          <p className={'text-sm'}>
            Make sure to copy your API key now as you will not be able to see this again.
          </p>
          <CopyableApiKey text={text} value={apiKey} />
        </div>
        <div className={'mt-4 flex flex-col flex-1 gap-4'}>
          <Button className={'w-full primary-outline'} onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const CopyableApiKey = ({ value, text }: { value: string; text: string }) => {
  const { setNotification } = useContext(NotificationContext);

  const handleCopy = (valueToCopy: string) => {
    void navigator.clipboard.writeText(valueToCopy);
    setNotification('API Key copied', 'Success!', 'success');
  };

  return (
    <div
      className={
        'flex flex-row gap-2.5 bg-surface-raised py-2 px-3 rounded-xl items-center max-w-full'
      }
    >
      <p className={'text-base text-text-secondary line-clamp-1'}>{text}</p>
      <ContentCopyIcon
        className="w5 h-5 fill-white/50 cursor-pointer"
        onClick={() => handleCopy(value)}
      />
    </div>
  );
};
