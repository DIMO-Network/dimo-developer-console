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
    console.log('CALLED THIS!!!!');
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
        <button
          title="Account Information"
          className="account-information"
          onClick={
            isOwner(currentUser?.role ?? '')
              ? handleOpenAccountInformationModal
              : undefined
          }
        >
          <WalletIcon className="h-4 w-4" />
        </button>
        <div className="credits" role="credits-display">
          <div className="credits-info">
            <p className="credit-amount">{dcxBalance}</p>
            <p className="credit-text">Credits</p>
          </div>

          <button
            title="Add Credits"
            className="btn-add-credits"
            onClick={
              isOwner(currentUser?.role ?? '') ? handleOpenBuyCreditsModal : undefined
            }
            role="add-credits"
          >
            {isOwner(currentUser?.role ?? '') && <PlusIcon className="h-4 w-4" />}
            {!isOwner(currentUser?.role ?? '') && <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        <UserAvatar name={user?.name ?? ''} />
      </div>
    </header>
  );
};
