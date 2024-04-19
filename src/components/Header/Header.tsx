import { type FC } from 'react';
import Image from 'next/image';

import { PlusIcon } from '@/components/Icons';
import BuildOnDIMO from '@/assets/images/build-on-dimo.png';
import './Header.css';

interface IProps {}

export const Header: FC<IProps> = () => {
  return (
    <header className="header">
      <Image src={BuildOnDIMO} alt="DIMO Logo" className="w-44 h-6" />
      <div className="user-information">
        <div className="user-avatar-default">
          <p className="default">SB</p>
        </div>
        <div className="credits">
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
