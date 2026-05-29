'use client';
import { type FC, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/hooks';
import Image from 'next/image';
import Link from 'next/link';
import './View.css';
import { BubbleLoader } from '@/components/BubbleLoader';
import { FOCUS_QUERY_PARAM, saveFocus } from '@/utils/focus';
import {
  DeveloperBoardIcon,
  ConnectionsIcon,
  IntegrationIcon,
  ChipIcon,
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
    description: 'Configure app connections and redirect URIs',
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
    label: 'Vehicle Explorer',
    description: 'Browse and query live vehicle telemetry data',
    icon: ChipIcon,
    href: '/explorer',
  },
];

export const View: FC = () => {
  const { data: user, isLoading: loadingUser } = useUser();
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
          {shortcuts.map(({ label, description, icon: Icon, href }) => (
            <Link key={href} href={href} className="shortcut-card">
              <div className="shortcut-card__icon">
                <Icon className="h-5 w-5" />
              </div>
              <div className="shortcut-card__body">
                <p className="shortcut-card__title">{label}</p>
                <p className="shortcut-card__desc">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default View;
