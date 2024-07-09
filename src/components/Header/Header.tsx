import { useContext, type FC } from 'react';
import { useSession } from 'next-auth/react';

import { CreditsContext } from '@/context/creditsContext';
import { PlusIcon } from '@/components/Icons';
import { useContract } from '@/hooks';
import { UserAvatar } from '@/components/UserAvatar';

import './Header.css';

export const Header: FC = () => {
  const { balance } = useContract();
  const { setIsOpen } = useContext(CreditsContext);
  const { data: session } = useSession();
  const { user: { name = '' } = {} } = session ?? {};

  const handleOpenBuyCreditsModal = () => {
    setIsOpen(true);
  };

  return (
    <header className="header">
      <img
        src={'/images/build-on-dimo.png'}
        alt="DIMO Logo"
        className="w-44 h-6"
      />
      <div className="user-information" role="user-information">
        <UserAvatar name={name ?? ''} />
        <div className="credits" role="credits-display">
          <div className="credits-info">
            <p className="credit-amount">{String(BigInt(balance))}</p>
            <p className="credit-text">Credits</p>
          </div>
          <button
            className="btn-add-credits"
            onClick={handleOpenBuyCreditsModal}
            role="add-credits"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
