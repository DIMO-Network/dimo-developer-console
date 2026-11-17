'use client';
import { type FC } from 'react';
import { useUser } from '@/hooks/useUser';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import './View.css';
import { BubbleLoader } from '@/components/BubbleLoader';
import { useTeam } from '@/hooks/useTeam';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import {
  DeveloperBoardIcon,
  ConnectionsIcon,
  IntegrationIcon,
  CarIcon,
} from '@/components/Icons';

function getFirstName(name: string) {
  const trimmed = name.trim();
  const [firstName] = trimmed.split(' ');
  return firstName || '';
}

const shortcuts = [
  {
    key: 'licenses',
    icon: DeveloperBoardIcon,
    href: '/licenses',
  },
  {
    key: 'connections',
    icon: ConnectionsIcon,
    href: '/connections',
  },
  {
    key: 'webhooks',
    icon: IntegrationIcon,
    href: '/webhooks',
  },
  {
    key: 'vehicles',
    icon: CarIcon,
    href: '/vehicles',
  },
];

// Members don't manage connections or webhooks (owner-only), and read
// Vehicles only while team data access is enabled (contracts C5).
export const visibleShortcuts = (isMember: boolean, dataAccessEnabled: boolean) =>
  shortcuts.filter((shortcut) => {
    if (!isMember) return true;
    if (shortcut.href === '/vehicles') return dataAccessEnabled;
    return shortcut.href !== '/connections' && shortcut.href !== '/webhooks';
  });

export const View: FC = () => {
  const t = useTranslations('app');
  const { data: user, isLoading: loadingUser } = useUser();
  const { isMember } = useTeam();
  const userFirstName = getFirstName(user?.name ?? '');

  return (
    <div className={'flex flex-1 flex-row'}>
      <div className="app-list-page">
        <div className="welcome-message">
          {loadingUser ? (
            <BubbleLoader isLoading isSmall />
          ) : (
            <>
              <Image
                src={'/images/waving_hand.svg'}
                width={16}
                height={16}
                alt={t('home.wavingHandAlt')}
              />
              <p className="title">
                {userFirstName
                  ? t('home.welcomeNamed', { name: userFirstName })
                  : t('home.welcome')}
              </p>
            </>
          )}
        </div>

        <div className="shortcuts-grid">
          {visibleShortcuts(isMember, TEAM_DATA_ACCESS_ENABLED).map(
            ({ key, icon: Icon, href }) => (
              <Link key={href} href={href} className="shortcut-card">
                <div className="shortcut-card__icon">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="shortcut-card__body">
                  <p className="shortcut-card__title">
                    {t(`home.shortcuts.${key}.label`)}
                  </p>
                  <p className="shortcut-card__desc">
                    {t(`home.shortcuts.${key}.description`)}
                  </p>
                </div>
              </Link>
            ),
          )}
        </div>
      </div>
    </div>
  );
};

export default View;
