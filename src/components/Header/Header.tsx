import { type FC } from 'react';

import { PlusIcon } from '@/components/Icons';
import { useUser } from '@/hooks';

import './Header.css';

interface IProps {}

export const Header: FC<IProps> = () => {
  const { user } = useUser();

  return (
    <header className="header">
      <img
        src={'/images/build-on-dimo.png'}
        alt="DIMO Logo"
        className="w-44 h-6"
      />
      <div className="user-information" role="user-information">
        <div className="user-avatar-default">
          <p className="default">SB</p>
        </div>
        <div className="credits" role="credits-display">
          <div className="credits-info">
            <p className="credit-amount">0</p>
            <p className="credit-text">Credits</p>
          </div>
          <span className="btn-add-credits">
            <PlusIcon className="h-4 w-4" />
          </span>
        </div>
      </div>
    </header>
  );
};
