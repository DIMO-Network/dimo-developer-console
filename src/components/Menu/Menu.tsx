import { type FC, useContext } from 'react';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import * as Sentry from '@sentry/nextjs';

import { BrandLockup } from '@/components/BrandLockup';
import { MenuItem } from '@/components/Menu/MenuItem';
import { getNavSections, bottomMenu } from '@/config/navigation';
import { useHasDeveloperLicenses } from '@/hooks/useHasDeveloperLicenses';
import { LayoutContext } from '@/context/LayoutContext';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { withLoadingStatus } from '@/hoc/withLoadingStatus';
import { signOut } from '@/actions/user';
import { turnkeyClient } from '@/config/turnkey';
import { clearSession } from '@/utils/globalAccountSession';
import { queryClient } from '@/hoc/QueryProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LogoutIcon } from '@/components/Icons/LogoutIcon';
import { cn } from '@/lib/utils';

import './Menu.css';
import { clearConsoleBrowserState } from '@/utils/consoleSession';
import { TeamSwitcher } from '@/components/TeamSwitcher';
import { useTeam } from '@/hooks/useTeam';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';

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
  const { hasDeveloperLicenses } = useHasDeveloperLicenses();

  const onSignOut = async () => {
    setLoadingStatus({ status: 'loading', label: 'Signing out' });
    clearConsoleBrowserState();
    // The server half first, best effort. It fails on the network, on a deploy
    // (an old action id), or with the proxy's 401 once the cookie no longer
    // verifies; none of that may leave the shared session live in every tab.
    try {
      await signOut();
    } catch (err) {
      Sentry.captureException(err, {
        extra: { context: 'Sign-out: the server half failed; signing out locally' },
      });
    }
    try {
      await turnkeyClient.logout();
    } catch {
      // Local only; the store below is what holds the session.
    }
    queryClient.clear();
    // Every other tab hears this and goes to sign-in.
    clearSession();
    clearLoadingStatus();
    router.replace('/sign-in');
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

  const { isMember } = useTeam();
  const sections = getNavSections(hasDeveloperLicenses !== false, {
    isMember,
    dataAccessEnabled: TEAM_DATA_ACCESS_ENABLED,
  });

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
      <TeamSwitcher collapsed={isSidebarCollapsed} />

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
            <LanguageSwitcher variant="menu" collapsed={isSidebarCollapsed} />
          </li>
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
