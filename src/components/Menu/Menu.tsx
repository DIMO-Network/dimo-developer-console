import { type FC, useContext } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import * as Sentry from '@sentry/nextjs';

import { BrandLockup } from '@/components/BrandLockup';
import { MenuItem } from '@/components/Menu/MenuItem';
import { getNavSections, bottomMenu } from '@/config/navigation';
import { useHasDeveloperLicenses } from '@/hooks';
import { LayoutContext } from '@/context/LayoutContext';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { withLoadingStatus } from '@/hoc';
import { signOut } from '@/actions/user';
import { turnkeyClient } from '@/config/turnkey';
import { GlobalAccountSession, removeFromSession } from '@/utils/sessionStorage';
import { EmbeddedKey, removeFromLocalStorage } from '@/utils/localStorage';
import { queryClient } from '@/hoc/QueryProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutIcon } from '@/components/Icons/LogoutIcon';
import { cn } from '@/lib/utils';

import './Menu.css';

export const Menu: FC = withLoadingStatus(() => {
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const {
    isFullScreenMenuOpen,
    setIsFullScreenMenuOpen,
    isSidebarCollapsed,
    setSidebarCollapsed,
  } = useContext(LayoutContext);
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

  const isHighlighted = (link: string | (() => void)) =>
    typeof link === 'string' && pathname.startsWith(link);

  const logoutItem = {
    label: 'Logout',
    icon: LogoutIcon,
    iconClassName: 'h-4 w-4',
    link: onSignOut,
    external: false,
    disabled: false,
  };

  const sections = getNavSections(licensesLoading || hasDeveloperLicenses);

  return (
    <div className={cn('main-menu', isSidebarCollapsed && 'collapsed')}>
      {/* Logo */}
      <div className={cn('logo-row', isSidebarCollapsed && 'justify-center')}>
        {!isSidebarCollapsed && (
          <div className="mb-7">
            <BrandLockup product="Developer Console" />
          </div>
        )}
        {isSidebarCollapsed && (
          <Image
            src="/images/dimo-mark.png"
            alt="DIMO"
            width={28}
            height={28}
            className="mb-7 h-7 w-7 rounded-lg"
          />
        )}
        {isFullScreenMenuOpen && (
          <button
            type="button"
            onClick={() => setIsFullScreenMenuOpen(false)}
            className="md:hidden ml-auto"
          >
            <XMarkIcon className="h-5 w-5 text-muted" />
          </button>
        )}
      </div>

      {/* Grouped nav sections */}
      <nav className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            {!isSidebarCollapsed && (
              <p className="mb-1 px-3 text-label text-muted">{section.label}</p>
            )}
            <ul className="flex flex-col gap-0.5">
              {section.items
                .filter((item) => !('hidden' in item && item.hidden))
                .map((item) => (
                  <MenuItem
                    key={item.label}
                    {...item}
                    isHighlighted={isHighlighted(item.link)}
                    isCollapsed={isSidebarCollapsed}
                  />
                ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom section */}
      <div className={cn('bottom-section', isSidebarCollapsed && 'items-center')}>
        <ul className="flex flex-col gap-0.5">
          {bottomMenu.map((item) => (
            <MenuItem
              key={item.label}
              {...item}
              isHighlighted={isHighlighted(item.link)}
              isCollapsed={isSidebarCollapsed}
            />
          ))}
          <li>
            <ThemeToggle variant="menu" collapsed={isSidebarCollapsed} />
          </li>
          <MenuItem
            {...logoutItem}
            isHighlighted={false}
            isCollapsed={isSidebarCollapsed}
          />
        </ul>
      </div>

      {/* Collapse toggle button — desktop only */}
      <button
        type="button"
        onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
        aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="collapse-btn hidden md:flex"
      >
        {isSidebarCollapsed ? (
          <ChevronRightIcon className="h-4 w-4" />
        ) : (
          <ChevronLeftIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
});
