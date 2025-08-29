import {
  HomeIcon,
  IntegrationIcon,
  MonitorHeartIcon,
  SettingsIcon,
  SummarizeIcon,
  SupportAgentIcon,
  ConnectionsIcon,
} from '@/components/Icons';

const APP_DETAILS_REGEX = /^\/app\/details\/[^/]+$/;
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
  '/webhooks': 'Webhooks',
  '/api-status': 'API Status',
  '/connections': 'Connections',
  '/settings': 'Settings',
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
    label: 'Webhooks',
    icon: IntegrationIcon,
    iconClassName: 'h-5 w-5 fill-white stroke-white stroke-1',
    link: '/webhooks',
    external: false,
    disabled: false,
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
    link: 'https://status.dimo.co/',
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
  if (includeConnections) {
    return [...baseMainMenu, connectionsMenuItem];
  }
  return baseMainMenu;
};

// Keep the old export for backward compatibility for now, always includes Connections
export const mainMenu = getMainMenu(true);

export const bottomMenu = [
  {
    label: 'Settings',
    icon: SettingsIcon,
    iconClassName: 'h-5 w-5 fill-grey-200',
    link: '/settings',
    external: false,
    disabled: false,
  },
];
