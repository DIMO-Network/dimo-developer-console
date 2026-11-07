import { useTranslations } from 'next-intl';
import { type FC } from 'react';
import './Header.css';
import { usePathname } from 'next/navigation';
import { getPageTitle } from '@/config/navigation';
import { CreditsWidget } from '@/components/CreditsWidget';
import { AccountInfoButton } from '@/components/AccountInfoButton';
import { DeveloperSupportButton } from '@/components/DeveloperSupportButton';

export const Header: FC = () => {
  const pathname = usePathname();
  const t = useTranslations('common');
  const titleKey = getPageTitle(pathname);

  return (
    <header className="header">
      <p className="page-title">{titleKey ? t(titleKey) : ''}</p>
      <div className="user-information" role="user-information">
        <CreditsWidget />
        <DeveloperSupportButton variant={'small'} />
        <AccountInfoButton />
      </div>
    </header>
  );
};
