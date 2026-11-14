import { FC } from 'react';
import { maskStringV2 } from 'maskdata';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('license');
  const tCommon = useTranslations('common');
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
          {t('apiKeyModal.title')}
        </Title>
        <div className={'flex flex-col gap-2 rounded-control bg-control px-4 py-3'}>
          <p className={'text-body-sm text-fg'}>{t('apiKeyModal.warning')}</p>
          <CopyableRow
            value={apiKey}
            displayText={text}
            onCopySuccessMessage={t('apiKeyModal.copied')}
          />
        </div>
        <div className={'mt-4 flex flex-col flex-1 gap-4'}>
          <Button variant="primary" className="w-full" onClick={onClose}>
            {tCommon('actions.done')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
