import React from 'react';
import {
  HomeIcon,
  IntegrationIcon,
  MonitorHeartIcon,
  SettingsIcon,
  SummarizeIcon,
  ConnectionsIcon,
  ChipIcon,
  DeveloperBoardIcon,
} from '@/components/Icons';

const APP_DETAILS_REGEX = /^\/app\/details\/[^/]+$/;
const EXPLORER_VEHICLE_REGEX = /^\/explorer\/[^/]+$/;
const LICENSE_DETAILS_REGEX = /^\/license\/details\/[^/]+$/;
const LICENSED_VEHICLES_REGEX = /^\/license\/vehicles\/[^/]+$/;
const CREATE_WEBHOOK_REGEX = /^\/webhooks\/create\/[^/]+$/;
const EDIT_WEBHOOK_REGEX = /^\/webhooks\/edit\/[^/]+\/[^/]+$/;
const CREATE_CONNECTION_REGEX = /^\/connections\/create\/[^/]+$/;
const CONNECTION_DETAILS_REGEX = /^\/connections\/[^/]+$/;

export const getPageTitle = (path: string) => {
  const staticPageTitle = pageTitles[path];
  if (staticPageTitle) return staticPageTitle;
  if (APP_DETAILS_REGEX.test(path)) return 'App Details';
  if (EXPLORER_VEHICLE_REGEX.test(path)) return 'Data Explorer';
  if (LICENSE_DETAILS_REGEX.test(path)) return 'License Details';
  if (LICENSED_VEHICLES_REGEX.test(path)) return 'Licensed Vehicles';
  if (CREATE_WEBHOOK_REGEX.test(path)) return 'Create a webhook';
  if (EDIT_WEBHOOK_REGEX.test(path)) return 'Edit webhook';
  if (CREATE_CONNECTION_REGEX.test(path)) return 'Create a Connection';
  if (CONNECTION_DETAILS_REGEX.test(path)) return 'Connection Details';
};

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/app': 'Home',
  '/licenses': 'Licenses',
  '/webhooks': 'Webhooks',
  '/api-status': 'API Status',
  '/connections': 'Connections',
  '/settings': 'Settings',
  '/explorer': 'Data Explorer',
};

const dataExplorerMenuItem = {
  label: 'Data Explorer',
  icon: ChipIcon,
  iconClassName: 'h-5 w-5',
  link: '/explorer',
  external: false,
  disabled: false,
  hidden: false,
};

const baseMainMenu = [
  {
    label: 'Home',
    icon: HomeIcon,
    iconClassName: 'h-5 w-5',
    link: '/app',
    external: false,
    disabled: false,
  },
  {
    label: 'Licenses',
    icon: DeveloperBoardIcon,
    iconClassName: 'h-5 w-5',
    link: '/licenses',
    external: false,
    disabled: false,
  },
  {
    label: 'Webhooks',
    icon: IntegrationIcon,
    iconClassName: 'h-5 w-5 fill-white stroke-white stroke-1',
    link: '/webhooks',
    external: false,
    disabled: false,
  },
  {
    label: 'Documentation',
    icon: SummarizeIcon,
    iconClassName: 'h-5 w-5',
    link: 'https://dimo.org/docs',
    external: true,
    disabled: false,
  },
  {
    label: 'API Status',
    icon: MonitorHeartIcon,
    iconClassName: 'h-5 w-5',
    link: 'https://stats.uptimerobot.com/snU0rkEEah',
    external: true,
    disabled: false,
  },
];

const connectionsMenuItem = {
  label: 'Connections',
  icon: ConnectionsIcon,
  iconClassName: 'h-5 w-5',
  link: '/connections',
  external: false,
  disabled: false,
};

/**
 * Get main menu items, optionally including Connections tab
 * @param includeConnections - Whether to include the Connections tab (requires developer license)
 */
export const getMainMenu = (includeConnections: boolean = true) => {
  const items = includeConnections
    ? [...baseMainMenu, connectionsMenuItem, dataExplorerMenuItem]
    : [...baseMainMenu, dataExplorerMenuItem];
  return items;
};

export type NavItem = {
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  iconClassName: string;
  link: string | (() => void);
  external: boolean;
  disabled: boolean;
  hidden?: boolean;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

// Keep the old export for backward compatibility for now, always includes Connections
export const mainMenu = getMainMenu(true);

export const bottomMenu: NavItem[] = [
  {
    label: 'Settings',
    icon: SettingsIcon,
    iconClassName: 'h-5 w-5 fill-grey-200',
    link: '/settings',
    external: false,
    disabled: false,
  },
];

export const getNavSections = (includeConnections: boolean = true): NavSection[] => [
  {
    label: 'Workspace',
    items: [
      {
        label: 'Home',
        icon: HomeIcon,
        iconClassName: 'h-4 w-4',
        link: '/app',
        external: false,
        disabled: false,
      },
      {
        label: 'Licenses',
        icon: DeveloperBoardIcon,
        iconClassName: 'h-4 w-4',
        link: '/licenses',
        external: false,
        disabled: false,
      },
      {
        label: 'Webhooks',
        icon: IntegrationIcon,
        iconClassName: 'h-4 w-4 fill-current stroke-current stroke-1',
        link: '/webhooks',
        external: false,
        disabled: false,
      },
      ...(includeConnections
        ? [
            {
              label: 'Connections',
              icon: ConnectionsIcon,
              iconClassName: 'h-4 w-4',
              link: '/connections',
              external: false,
              disabled: false,
            },
          ]
        : []),
    ],
  },
  {
    label: 'Resources',
    items: [
      {
        label: 'Data Explorer',
        icon: ChipIcon,
        iconClassName: 'h-4 w-4',
        link: '/explorer',
        external: false,
        disabled: false,
      },
      {
        label: 'Documentation',
        icon: SummarizeIcon,
        iconClassName: 'h-4 w-4',
        link: 'https://dimo.org/docs',
        external: true,
        disabled: false,
      },
      {
        label: 'API Status',
        icon: MonitorHeartIcon,
        iconClassName: 'h-4 w-4',
        link: 'https://stats.uptimerobot.com/snU0rkEEah',
        external: true,
        disabled: false,
      },
    ],
  },
];
