'use client';

import { useTranslations } from 'next-intl';
import { useContext, type FC } from 'react';
import { Modal } from '@/components/Modal';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { AccountInformation } from '@/components/AccountInformationModal/components/AccountInformation';

import './shared/AccountInformationModal.css';
import { Balances } from '@/components/AccountInformationModal/components/Balances';

export const AccountInformationModal: FC = () => {
  const t = useTranslations('common');
  const { showAccountInformation, setShowAccountInformation } = useContext(
    AccountInformationContext,
  );
  return (
    <Modal
      isOpen={showAccountInformation}
      setIsOpen={setShowAccountInformation}
      className="account-information-modal"
    >
      <div className="account-information-content">
        <div className="account-information-header">
          <Title className="text-panel-title" component="h3">
            {t('accountInfo.modalTitle')}
          </Title>
        </div>
        <div className="account-information-body">
          <AccountInformation />
          <Balances shouldFetchBalances={showAccountInformation} />
        </div>
        <Button variant="secondary" onClick={() => setShowAccountInformation(false)}>
          {t('actions.close')}
        </Button>
      </div>
    </Modal>
  );
};
