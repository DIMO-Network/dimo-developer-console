'use client';
import { type FC, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks';
import Image from 'next/image';
import Link from 'next/link';
import './View.css';
import { BubbleLoader } from '@/components/BubbleLoader';
import { useTeam } from '@/hooks/useTeam';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';
import { FOCUS_QUERY_PARAM, saveFocus } from '@/utils/focus';
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
    label: 'Licenses',
    description: 'View and manage your developer licenses',
    icon: DeveloperBoardIcon,
    href: '/licenses',
  },
  {
    label: 'Connections',
    description: 'Configure connections to bring your own data',
    icon: ConnectionsIcon,
    href: '/connections',
  },
  {
    label: 'Webhooks',
    description: 'Create and manage webhook event subscriptions',
    icon: IntegrationIcon,
    href: '/webhooks',
  },
  {
    label: 'Vehicles',
    description: 'See what data each shared vehicle sends and browse its raw events',
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
  const { data: user, isLoading: loadingUser } = useUser();
  const { isMember } = useTeam();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const userFirstName = getFirstName(user?.name ?? '');

  useEffect(() => {
    const focus = searchParams.get(FOCUS_QUERY_PARAM);
    if (!focus) return;
    saveFocus(focus);
    const next = new URLSearchParams(searchParams.toString());
    next.delete(FOCUS_QUERY_PARAM);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, router, pathname]);

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
                alt={'waving-hand'}
              />
              <p className="title">Welcome{userFirstName ? `, ${userFirstName}` : '!'}</p>
            </>
          )}
        </div>

        <div className="shortcuts-grid">
          {visibleShortcuts(isMember, TEAM_DATA_ACCESS_ENABLED).map(
            ({ label, description, icon: Icon, href }) => (
              <Link key={href} href={href} className="shortcut-card">
                <div className="shortcut-card__icon">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="shortcut-card__body">
                  <p className="shortcut-card__title">{label}</p>
                  <p className="shortcut-card__desc">{description}</p>
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
