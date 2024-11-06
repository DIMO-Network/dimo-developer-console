'use client';

import { get } from 'lodash';
import { useContext, type FC } from 'react';
import { Modal } from '@/components/Modal';
import { AccountInformationContext } from '@/context/AccountInformationContext';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { useGlobalAccount } from '@/hooks';
import { useSession } from 'next-auth/react';
import { ContentCopyIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';
import { TokenBalance } from '@/components/TokenBalance';
import { useContractGA } from '@/hooks';

import './AccountInformationModal.css';
import { CreditsContext } from '@/context/creditsContext';

interface IProps {}

export const AccountInformationModal: FC<IProps> = () => {
  const { organizationInfo } = useGlobalAccount();
  const { data: session } = useSession();
  const { setNotification } = useContext(NotificationContext);
  const { setIsOpen } = useContext(CreditsContext);
  const { showAccountInformation, setShowAccountInformation } = useContext(
      AccountInformationContext,
  );

  const { balanceDimo, balanceDCX } = useContractGA();

  const handleCopy = (value: string) => {
    void navigator.clipboard.writeText(value);
    setNotification(
        'Wallet address copied to clipboard',
        'Success',
        'success',
        1000,
    );
  };

  const handleOpenBuyCreditsModal = () => {
    setShowAccountInformation(false);
    setTimeout(() =>
      setIsOpen(true)
    , 300);
  };

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
                Email
                <TextField
                    name="email"
                    type="text"
                    readOnly={true}
                    value={get(session, 'user.email', '')}
                />
              </Label>
            </div>
            <div className="account-information-row">
              <Label htmlFor="email" className="text-xs text-medium">
                Wallet Address
                <TextField
                    name="wallet"
                    type="text"
                    readOnly={true}
                    value={get(organizationInfo, 'smartContractAddress', '')}
                    action={
                      <ContentCopyIcon
                          className="w5 h-5 fill-white/50 cursor-pointer"
                          onClick={() =>
                              handleCopy(
                                  get(organizationInfo, 'smartContractAddress', ''),
                              )
                          }
                      />
                    }
                />
              </Label>
            </div>
            <div className="balances">
              <TokenBalance
                  token={'dimo'}
                  balance={balanceDimo}
                  exchangeRate={5.86}
                  canBuy={false}
              />
              <TokenBalance
                  token={'dcx'}
                  balance={balanceDCX}
                  exchangeRate={5.86}
                  canBuy={true}
                  openBuyModal={handleOpenBuyCreditsModal}
              />
            </div>
          </div>
        </div>
      </Modal>
  );
};

export default AccountInformationModal;
