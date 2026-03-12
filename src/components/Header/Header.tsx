import { type FC } from 'react';

import './Header.css';
import { usePathname } from 'next/navigation';
import { getPageTitle } from '@/config/navigation';
import { CreditsWidget } from '@/components/CreditsWidget';
import { AccountInfoButton } from '@/components/AccountInfoButton';
import { DeveloperSupportButton } from '@/components/DeveloperSupportButton';

export const Header: FC = () => {
  const pathname = usePathname();

  return (
    <header className="header">
      <p className="page-title">{getPageTitle(pathname) ?? ''}</p>
      <div className="user-information" role="user-information">
        <CreditsWidget />
        <DeveloperSupportButton variant={'small'} />
        <AccountInfoButton />
      </div>
    </header>
  );
};
