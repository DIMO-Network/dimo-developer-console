import { type FC, useContext } from 'react';

import { MenuItem } from '@/components/Menu/MenuItem';
import { getMainMenu, bottomMenu } from '@/config/navigation';
import { useHasDeveloperLicenses } from '@/hooks';

import './Menu.css';
import { BrandLockup } from '@/components/BrandLockup';
import { ThemeToggle } from '@/components/ThemeToggle';
import { usePathname, useRouter } from 'next/navigation';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { LayoutContext } from '@/context/LayoutContext';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { withLoadingStatus } from '@/hoc';
import { signOut } from '@/actions/user';
import { turnkeyClient } from '@/config/turnkey';
import { GlobalAccountSession, removeFromSession } from '@/utils/sessionStorage';
import { EmbeddedKey, removeFromLocalStorage } from '@/utils/localStorage';
import * as Sentry from '@sentry/nextjs';
import { queryClient } from '@/hoc/QueryProvider';
import { LogoutIcon } from '@/components/Icons/LogoutIcon';

export const Menu: FC = withLoadingStatus(() => {
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const pathname = usePathname();
  const router = useRouter();
  const { hasDeveloperLicenses, loading: licensesLoading } = useHasDeveloperLicenses();

  const onSignOut = async () => {
    try {
      setLoadingStatus({ status: 'loading', label: 'Signing out' });
      await signOut();
      await turnkeyClient.logout();
      queryClient.clear();
      removeFromSession(GlobalAccountSession);
      removeFromLocalStorage(EmbeddedKey);
      clearLoadingStatus();
      router.replace('/sign-in');
    } catch (err) {
      Sentry.captureException(err);
      setLoadingStatus({ status: 'error', label: 'There was a problem signing you out' });
    }
  };

  const getIsHighlighted = (item: { link: string | (() => void) }) => {
    return typeof item.link === 'string' && pathname.startsWith(item.link);
  };

  const logoutButtonConfig = {
    label: 'Logout',
    icon: LogoutIcon,
    iconClassName: 'h-5 w-5',
    link: onSignOut,
    external: false,
    disabled: false,
  };

  const menuItems = getMainMenu(licensesLoading || hasDeveloperLicenses);

  return (
    <div className={'main-menu'}>
      <ul className="top-menu">
        <div className="menu-brand">
          <BrandLockup product="Developer Console" />
          <MenuCloseButton />
        </div>

        {menuItems
          .filter((item) => !('hidden' in item && item.hidden))
          .map((item) => {
            return (
              <MenuItem
                key={item.link}
                {...item}
                isHighlighted={getIsHighlighted(item)}
              />
            );
          })}
      </ul>
      <ul className="bottom-menu">
        <li className="theme-toggle-item">
          <ThemeToggle variant="menu" />
        </li>
        {[logoutButtonConfig, ...bottomMenu].map((item) => (
          <MenuItem key={item.label} {...item} isHighlighted={getIsHighlighted(item)} />
        ))}
      </ul>
    </div>
  );
});

const MenuCloseButton = () => {
  const { setIsFullScreenMenuOpen } = useContext(LayoutContext);

  return (
    <div className={'md:hidden'}>
      <button onClick={() => setIsFullScreenMenuOpen(false)}>
        <XMarkIcon className={'size-6 text-muted'} />
      </button>
    </div>
  );
};
