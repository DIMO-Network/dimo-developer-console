'use client';

import { get } from 'lodash';
import { useContext, type FC, useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { useLoading } from '@/hooks';
import { ContentCopyIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';
import { TokenBalance } from '@/components/TokenBalance';
import { useContractGA } from '@/hooks';
import config from '@/config';
import * as Sentry from '@sentry/nextjs';

import './AccountInformationModal.css';
import { CreditsContext } from '@/context/creditsContext';
import useCryptoPricing from '@/hooks/useCryptoPricing';
import { BubbleLoader } from '@/components/BubbleLoader';
import { getFromSession, GlobalAccountSession } from '@/utils/sessionStorage';
import { IGlobalAccountSession } from '@/types/wallet';

interface IProps {}

export const AccountInformationModal: FC<IProps> = () => {
  const { setNotification } = useContext(NotificationContext);
  const { setIsOpen } = useContext(CreditsContext);
  const { showAccountInformation, setShowAccountInformation } = useContext(
    AccountInformationContext,
  );

  const { getDimoBalance, getDcxBalance } =
    useContractGA();
  const { getDimoPrice } = useCryptoPricing();
  const [balance, setBalance] = useState<{
    dcxBalance: number;
    dimoBalance: number;
    dimoPrice: number;
  }>({ dcxBalance: 0, dimoBalance: 0, dimoPrice: 0 });

  const handleCopy = (value: string) => {
    void navigator.clipboard.writeText(value);
    setNotification('Wallet address copied to clipboard', 'Success', 'success', 1000);
  };

  const handleOpenBuyCreditsModal = () => {
    setShowAccountInformation(false);
    setTimeout(() => setIsOpen(true), 300);
  };

  const loadBalances = async () => {
    const dimoBalance = await getDimoBalance();
    const dcxBalance = await getDcxBalance();
    const dimoPrice = await getDimoPrice();
    setBalance({ dimoBalance, dcxBalance, dimoPrice });
  };

  const { handleAction: getBalances, loading: isLoadingBalances } =
    useLoading(loadBalances);

  useEffect(() => {
    if (!showAccountInformation) return;
    getBalances().catch((error) => {
      Sentry.captureException(error);
      console.error('Error while loading balances', error);
      setNotification('Error while loading balances', 'Error', 'error');
    });
  }, [showAccountInformation]);

  const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
  const organizationInfo = gaSession?.organization;

  return (
    <Modal
      isOpen={showAccountInformation}
      setIsOpen={setShowAccountInformation}
      className="account-information-modal"
    >
      <div className="account-information-content">
        <div className="account-information-header">
          <Title className="text-2xl" component="h3">
            Account Information
          </Title>
        </div>
        <div className="account-information-body">
          <div className="account-information-row">
            <Label htmlFor="email" className="text-xs text-medium">
              Owner Email
              <TextField
                name="email"
                type="text"
                readOnly={true}
                value={get(organizationInfo, 'email', '')}
              />
            </Label>
          </div>
          <div className="account-information-row">
            <Label htmlFor="email" className="text-xs text-medium">
              Organization Wallet Address
              <TextField
                name="wallet"
                type="text"
                readOnly={true}
                value={get(organizationInfo, 'smartContractAddress', '')}
                action={
                  <ContentCopyIcon
                    className="w5 h-5 fill-white/50 cursor-pointer"
                    onClick={() =>
                      handleCopy(get(organizationInfo, 'smartContractAddress', ''))
                    }
                  />
                }
              />
            </Label>
          </div>
          <div className="balances">
            {isLoadingBalances && (
              <>
                <BubbleLoader isLoading={isLoadingBalances} />
                <p className="loading-text">Loading your balances...</p>
              </>
            )}
            {!isLoadingBalances && (
              <>
                <TokenBalance
                  token={'dimo'}
                  balance={balance.dimoBalance}
                  basePrice={balance.dimoPrice}
                  canBuy={false}
                />
                <TokenBalance
                  token={'dcx'}
                  balance={balance.dcxBalance}
                  basePrice={0.001}
                  canBuy={balance.dcxBalance < config.MINIMUM_CREDITS}
                  openBuyModal={handleOpenBuyCreditsModal}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AccountInformationModal;
