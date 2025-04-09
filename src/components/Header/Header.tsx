import { useContext, type FC, useState, useEffect } from 'react';

import { CreditsContext } from '@/context/creditsContext';
import { PlusIcon, WalletIcon } from '@/components/Icons';
import { EyeIcon } from '@heroicons/react/24/outline';
import { UserAvatar } from '@/components/UserAvatar';

import { AccountInformationContext } from '@/context/AccountInformationContext';
import { formatToHumanReadable } from '@/utils/formatBalance';
import { isCollaborator, isOwner } from '@/utils/user';
import { useGlobalAccount, useUser } from '@/hooks';
import * as Sentry from '@sentry/nextjs';

import './Header.css';
import { usePathname } from 'next/navigation';
import { getPageTitle } from '@/config/navigation';

export const Header: FC = () => {
  const { user } = useUser();
  const { currentUser, getCurrentDcxBalance } = useGlobalAccount();
  const [dcxBalance, setDcxBalance] = useState<string>('0');
  const { setIsOpen } = useContext(CreditsContext);
  const { setShowAccountInformation } = useContext(AccountInformationContext);
  const pathname = usePathname();

  const handleOpenBuyCreditsModal = () => {
    setIsOpen(true);
  };

  const handleOpenAccountInformationModal = () => {
    setShowAccountInformation(true);
  };

  const loadAndFormatDcxBalance = async () => {
    try {
      if (isCollaborator(currentUser?.role ?? '')) return;
      const balance = await getCurrentDcxBalance();
      setDcxBalance(formatToHumanReadable(balance));
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error(error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    void loadAndFormatDcxBalance();
  }, [currentUser]);

  return (
    <header className="header">
      <p className="page-title">{getPageTitle(pathname) ?? ''}</p>
      <div className="user-information" role="user-information">
        <div className="credits" role="credits-display">
          <div className="credits-info">
            <div className={'flex flex-row items-center gap-1'}>
              <WalletIcon className="w-4 h-4" />
              <p className="credit-amount">{dcxBalance}</p>
              <p className="credit-text">DCX</p>
            </div>
            <button
              title="Add Credits"
              className="btn-add-credits"
              disabled={!isOwner(currentUser?.role ?? '')}
              onClick={
                isOwner(currentUser?.role ?? '') ? handleOpenBuyCreditsModal : undefined
              }
              role="add-credits"
            >
              <PlusIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          title="Account Information"
          onClick={
            isOwner(currentUser?.role ?? '')
              ? handleOpenAccountInformationModal
              : undefined
          }
        >
          <UserAvatar name={user?.name ?? ''} />
        </button>
      </div>
    </header>
  );
};
