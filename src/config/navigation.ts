import {
  HomeIcon,
  IntegrationIcon,
  MonitorHeartIcon,
  SettingsIcon,
  SummarizeIcon,
  SupportAgentIcon,
  ToolsIcon,
} from '@/components/Icons';

const APP_DETAILS_REGEX = /^\/app\/details\/[^/]+$/;
const LICENSE_DETAILS_REGEX = /^\/license\/details\/[^/]+$/;
const LICENSED_VEHICLES_REGEX = /^\/license\/vehicles\/[^/]+$/;
const CREATE_WEBHOOK_REGEX = /^\/webhooks\/create\/[^/]+$/;
const EDIT_WEBHOOK_REGEX = /^\/webhooks\/edit\/[^/]+\/[^/]+$/;

export const getPageTitle = (path: string) => {
  const staticPageTitle = pageTitles[path];
  if (staticPageTitle) return staticPageTitle;
  if (APP_DETAILS_REGEX.test(path)) return 'App Details';
  if (LICENSE_DETAILS_REGEX.test(path)) return 'License Details';
  if (LICENSED_VEHICLES_REGEX.test(path)) return 'Licensed Vehicles';
  if (CREATE_WEBHOOK_REGEX.test(path)) return 'Create a webhook';
  if (EDIT_WEBHOOK_REGEX.test(path)) return 'Edit webhook';
};

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/app': 'Home',
  '/webhooks': 'Webhooks',
  '/simulator': 'Simulator',
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
    label: 'Webhooks',
    icon: IntegrationIcon,
    iconClassName: 'h-5 w-5 fill-white stroke-white stroke-1',
    link: '/webhooks',
    external: false,
    disabled: false,
  },
  {
    label: 'Simulator',
    icon: ToolsIcon,
    iconClassName: 'h-5 w-5',
    link: '/simulator',
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
