import React from 'react';
import {
  CarRentalIcon,
  HomeIcon,
  IntegrationIcon,
  MonitorHeartIcon,
  SettingsIcon,
  SummarizeIcon,
  ConnectionsIcon,
  CarIcon,
  DeveloperBoardIcon,
} from '@/components/Icons';
import { TEMPLATE_EDITOR_ENABLED } from '@/utils/featureFlags';

const VEHICLE_DETAIL_REGEX = /^\/vehicles\/[^/]+$/;
const LICENSE_DETAILS_REGEX = /^\/license\/[^/]+\/details$/;
// The list, /new and /[id]; each page names itself in its own subtitle.
const LICENSE_CONFIGURATOR_REGEX = /^\/license\/[^/]+\/configurator(\/[^/]+)?$/;
const LICENSED_VEHICLES_REGEX = /^\/license\/vehicles\/[^/]+$/;
const TEMPLATE_EDIT_REGEX = /^\/templates\/[^/]+$/;
const CREATE_WEBHOOK_REGEX = /^\/webhooks\/create\/[^/]+$/;
const EDIT_WEBHOOK_REGEX = /^\/webhooks\/edit\/[^/]+\/[^/]+$/;
const CREATE_CONNECTION_REGEX = /^\/connections\/create\/[^/]+$/;
const CONNECTION_DETAILS_REGEX = /^\/connections\/[^/]+$/;

export const getPageTitle = (path: string) => {
  const staticPageTitle = pageTitles[path];
  if (staticPageTitle) return staticPageTitle;
  if (VEHICLE_DETAIL_REGEX.test(path)) return 'Vehicle';
  if (LICENSE_DETAILS_REGEX.test(path)) return 'License details';
  if (LICENSE_CONFIGURATOR_REGEX.test(path)) return 'SDK configurator';
  if (LICENSED_VEHICLES_REGEX.test(path)) return 'Licensed vehicles';
  if (CREATE_WEBHOOK_REGEX.test(path)) return 'Create a webhook';
  if (EDIT_WEBHOOK_REGEX.test(path)) return 'Edit webhook';
  if (CREATE_CONNECTION_REGEX.test(path)) return 'Create a connection';
  if (CONNECTION_DETAILS_REGEX.test(path)) return 'Connection details';
  // Ordered before TEMPLATE_EDIT_REGEX, which would otherwise match
  // /templates/new and title the create page "Edit template".
  if (path === '/templates/new') return 'New template';
  if (TEMPLATE_EDIT_REGEX.test(path)) return 'Edit template';
};

const pageTitles: Record<string, string> = {
  '/': 'Home',
  '/app': 'Home',
  '/licenses': 'Licenses',
  '/webhooks': 'Webhooks',
  '/templates': 'Vehicle templates',
  '/connections': 'Connections',
  '/settings': 'Settings',
  '/vehicles': 'Vehicles',
  '/support': 'Support',
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

export const bottomMenu: NavItem[] = [
  {
    label: 'Settings',
    icon: SettingsIcon,
    iconClassName: 'h-5 w-5',
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
        label: 'Vehicles',
        icon: CarIcon,
        iconClassName: 'h-4 w-4',
        link: '/vehicles',
        external: false,
        disabled: false,
      },
      {
        label: 'Webhooks',
        icon: IntegrationIcon,
        iconClassName: 'h-4 w-4',
        link: '/webhooks',
        external: false,
        disabled: false,
      },
      {
        label: 'Templates',
        icon: CarRentalIcon,
        iconClassName: 'h-4 w-4',
        link: '/templates',
        external: false,
        disabled: !TEMPLATE_EDITOR_ENABLED,
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
        label: 'Documentation',
        icon: SummarizeIcon,
        iconClassName: 'h-4 w-4',
        link: 'https://dimo.org/docs',
        external: true,
        disabled: false,
      },
      {
        label: 'API status',
        icon: MonitorHeartIcon,
        iconClassName: 'h-4 w-4',
        link: 'https://stats.uptimerobot.com/snU0rkEEah',
        external: true,
        disabled: false,
      },
    ],
  },
];
