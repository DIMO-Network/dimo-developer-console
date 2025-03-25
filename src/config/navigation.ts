import { type FC } from 'react';
import { ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline';

import {
  HomeIcon,
  IntegrationIcon,
  MonitorHeartIcon,
  SettingsIcon,
  SummarizeIcon,
  SupportAgentIcon,
} from '@/components/Icons';
import { GlobalAccountSession, removeFromSession } from '@/utils/sessionStorage';
import { turnkeyClient } from './turnkey';
import { removeFromLocalStorage, EmbeddedKey } from '@/utils/localStorage';

const APP_DETAILS_REGEX = /^\/app\/details\/[^/]+$/;
const LICENSE_DETAILS_REGEX = /^\/license\/details\/[^/]+$/;

export const getPageTitle = (path: string) => {
  const staticPageTitle = pageTitles[path];
  if (staticPageTitle) return staticPageTitle;
  if (APP_DETAILS_REGEX.test(path)) return 'App Details';
  if (LICENSE_DETAILS_REGEX.test(path)) return 'License Details';
};

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/app': 'Home',
  '/integrations': 'Integrations',
  '/api-status': 'API Status',
  '/settings': 'Settings',
};

export const mainMenu = [
  {
    label: 'Home',
    icon: HomeIcon,
    iconClassName: 'h-5 w-5',
    link: '/app',
    external: false,
    disabled: false,
  },
  {
    label: 'Integrations',
    icon: IntegrationIcon,
    iconClassName: 'h-5 w-5 fill-white stroke-white stroke-1',
    link: '/integrations',
    external: false,
    disabled: true,
  },
  {
    label: 'Support',
    icon: SupportAgentIcon,
    iconClassName: 'h-5 w-5',
    link: 'https://discord.com/channels/892438668453740634/940719111971946546',
    external: true,
    disabled: false,
  },
  {
    label: 'Documentation',
    icon: SummarizeIcon,
    iconClassName: 'h-5 w-5',
    link: 'https://docs.dimo.zone/developer-platform',
    external: true,
    disabled: false,
  },
  {
    label: 'API Status',
    icon: MonitorHeartIcon,
    iconClassName: 'h-5 w-5',
    link: '/api-status',
    external: false,
    disabled: true,
  },
];

export const bottomMenu = [
  {
    label: 'Logout',
    icon: ArrowLeftStartOnRectangleIcon as FC,
    iconClassName: 'h-5 w-5 fill-grey-200',
    link: () => {
      turnkeyClient.logout();
      removeFromSession(GlobalAccountSession);
      removeFromLocalStorage(EmbeddedKey);
    },
    external: false,
    disabled: false,
  },
  {
    label: 'Settings',
    icon: SettingsIcon,
    iconClassName: 'h-5 w-5 fill-grey-200',
    link: '/settings',
    external: false,
    disabled: false,
  },
];
