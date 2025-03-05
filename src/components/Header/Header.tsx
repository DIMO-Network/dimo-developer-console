import { useContext, type FC, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { CreditsContext } from '@/context/creditsContext';
import { PlusIcon, WalletIcon } from '@/components/Icons';
import { EyeIcon } from '@heroicons/react/24/outline';
import { UserAvatar } from '@/components/UserAvatar';

import { AccountInformationContext } from '@/context/AccountInformationContext';
import { formatToHumanReadable } from '@/utils/formatBalance';
import { isOwner } from '@/utils/user';
import { useContractGA } from '@/hooks';
import * as Sentry from '@sentry/nextjs';

import './Header.css';
import { GlobalAccountAuthContext } from '@/context/GlobalAccountAuthContext';
import {usePathname} from "next/navigation";
import {pageTitles} from "@/config/navigation";

export const Header: FC = () => {
  const { hasSession } = useContext(GlobalAccountAuthContext);
  const [dcxBalance, setDcxBalance] = useState<string>('0');
  const { setIsOpen } = useContext(CreditsContext);
  const { getDcxBalance } = useContractGA();
  const { setShowAccountInformation } = useContext(AccountInformationContext);
  const { data: session } = useSession();
  const { user: { name = '', role = '' } = {} } = session ?? {};
  const pathname = usePathname();

  const handleOpenBuyCreditsModal = () => {
    setIsOpen(true);
  };

  const handleOpenAccountInformationModal = () => {
    setShowAccountInformation(true);
  };

  const loadAndFormatDcxBalance = async () => {
    try {
      const balance = await getDcxBalance();
      setDcxBalance(formatToHumanReadable(balance));
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error(error);
    }
  };

  useEffect(() => {
    if (!hasSession) return;
    void loadAndFormatDcxBalance();
  }, [hasSession]);

  return (
    <header className="header">
      <p className="page-title">{pageTitles[pathname]}</p>
      <div className="user-information" role="user-information">
        <button
          title="Account Information"
          className="account-information"
          onClick={handleOpenAccountInformationModal}
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
              isOwner(role)
                ? handleOpenBuyCreditsModal
                : handleOpenAccountInformationModal
            }
            role="add-credits"
          >
            {isOwner(role) && <PlusIcon className="h-4 w-4" />}
            {!isOwner(role) && <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
        <UserAvatar name={name ?? ''} />

      </div>
    </header>
  );
};
