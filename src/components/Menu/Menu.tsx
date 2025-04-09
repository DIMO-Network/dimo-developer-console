import { type FC, useContext } from 'react';

import { MenuItem } from '@/components/Menu/MenuItem';
import { mainMenu, bottomMenu } from '@/config/navigation';

import './Menu.css';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { LayoutContext } from '@/context/LayoutContext';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { withLoadingStatus } from '@/hoc';
import { signOut } from '@/actions/user';
import { turnkeyClient } from '@/config/turnkey';
import { GlobalAccountSession, removeFromSession } from '@/utils/sessionStorage';
import { EmbeddedKey, removeFromLocalStorage } from '@/utils/localStorage';
import { ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline';
import * as Sentry from '@sentry/nextjs';
import { queryClient } from '@/hoc/QueryProvider';

export const Menu: FC = withLoadingStatus(() => {
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const pathname = usePathname();
  const router = useRouter();

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
    return typeof item.link === 'string' && pathname === item.link;
  };

  const logoutButtonConfig = {
    label: 'Logout',
    icon: ArrowLeftStartOnRectangleIcon as FC,
    iconClassName: 'h-5 w-5 fill-grey-200',
    link: onSignOut,
    external: false,
    disabled: false,
  };

  return (
    <div className={'main-menu'}>
      <ul className="top-menu">
        <div className={'flex flex-row justify-between'}>
          <Image
            src={'/images/dimo-dev.svg'}
            alt="DIMO Logo"
            width={176}
            height={24}
            className={'mb-10'}
          />
          <MenuCloseButton />
        </div>

        {mainMenu.map((item) => {
          return (
            <MenuItem key={item.link} {...item} isHighlighted={getIsHighlighted(item)} />
          );
        })}
      </ul>
      <ul className="bottom-menu">
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
        <XMarkIcon className={'size-6 text-white'} />
      </button>
    </div>
  );
};
