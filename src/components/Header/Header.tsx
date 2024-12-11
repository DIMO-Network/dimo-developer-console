import { useContext, type FC, useMemo } from 'react';
import { useSession } from 'next-auth/react';

import { CreditsContext } from '@/context/creditsContext';
import { PlusIcon, WalletIcon } from '@/components/Icons';
import { EyeIcon } from '@heroicons/react/24/outline';
import { UserAvatar } from '@/components/UserAvatar';

import { AccountInformationContext } from '@/context/AccountInformationContext';
import { useContractGA } from '@/hooks';
import { formatToHumanReadable } from '@/utils/formatBalance';
import { TeamRoles } from '@/types/team';

import './Header.css';

export const Header: FC = () => {
  const { setIsOpen } = useContext(CreditsContext);
  const { balanceDCX } = useContractGA();
  const { setShowAccountInformation } = useContext(AccountInformationContext);
  const { data: session } = useSession();
  const { user: { name = '', role = '' } = {} } = session ?? {};

  const handleOpenBuyCreditsModal = () => {
    setIsOpen(true);
  };

  const handleOpenAccountInformationModal = () => {
    setShowAccountInformation(true);
  };

  const dcxBalance = useMemo(() => {
    if (!balanceDCX) return '0';
    if (balanceDCX <= 0) return '0';
    return formatToHumanReadable(balanceDCX);
  }, [balanceDCX]);

  return (
    <header className="header">
      <img
        src={'/images/build-on-dimo.png'}
        alt="DIMO Logo"
        className="w-44 h-6"
      />
      <div className="user-information" role="user-information">
        <UserAvatar name={name ?? ''} />
        <button
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
            className="btn-add-credits"
            onClick={
              role === TeamRoles.OWNER
                ? handleOpenBuyCreditsModal
                : handleOpenAccountInformationModal
            }
            role="add-credits"
          >
            {role === TeamRoles.OWNER && <PlusIcon className="h-4 w-4" />}
            {role !== TeamRoles.OWNER && <EyeIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
