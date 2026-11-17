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
  if (VEHICLE_DETAIL_REGEX.test(path)) return 'navigation.pageTitles.vehicle';
  if (LICENSE_DETAILS_REGEX.test(path)) return 'navigation.pageTitles.licenseDetails';
  if (LICENSE_CONFIGURATOR_REGEX.test(path))
    return 'navigation.pageTitles.sdkConfigurator';
  if (LICENSED_VEHICLES_REGEX.test(path)) return 'navigation.pageTitles.licensedVehicles';
  if (CREATE_WEBHOOK_REGEX.test(path)) return 'navigation.pageTitles.createWebhook';
  if (EDIT_WEBHOOK_REGEX.test(path)) return 'navigation.pageTitles.editWebhook';
  if (CREATE_CONNECTION_REGEX.test(path)) return 'navigation.pageTitles.createConnection';
  if (CONNECTION_DETAILS_REGEX.test(path))
    return 'navigation.pageTitles.connectionDetails';
  // Ordered before TEMPLATE_EDIT_REGEX, which would otherwise match
  // /templates/new and title the create page "Edit template".
  if (path === '/templates/new') return 'navigation.pageTitles.newTemplate';
  if (TEMPLATE_EDIT_REGEX.test(path)) return 'navigation.pageTitles.editTemplate';
};

// Message keys in the common namespace; the header translates them.
const pageTitles: Record<string, string> = {
  '/': 'navigation.pageTitles.home',
  '/app': 'navigation.pageTitles.home',
  '/licenses': 'navigation.pageTitles.licenses',
  '/webhooks': 'navigation.pageTitles.webhooks',
  '/templates': 'navigation.pageTitles.templates',
  '/connections': 'navigation.pageTitles.connections',
  '/settings': 'navigation.pageTitles.settings',
  '/vehicles': 'navigation.pageTitles.vehicles',
  '/support': 'navigation.pageTitles.support',
};

export type NavItem = {
  labelKey: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.FC<any>;
  iconClassName: string;
  link: string | (() => void);
  external: boolean;
  disabled: boolean;
  hidden?: boolean;
};

export type NavSection = {
  labelKey: string;
  items: NavItem[];
};

export const bottomMenu: NavItem[] = [
  {
    labelKey: 'navigation.items.settings',
    icon: SettingsIcon,
    iconClassName: 'h-5 w-5',
    link: '/settings',
    external: false,
    disabled: false,
  },
];

export const getNavSections = (
  includeConnections: boolean = true,
  {
    isMember = false,
    dataAccessEnabled = false,
  }: { isMember?: boolean; dataAccessEnabled?: boolean } = {},
): NavSection[] => [
  {
    labelKey: 'navigation.sections.workspace',
    items: [
      {
        labelKey: 'navigation.items.home',
        icon: HomeIcon,
        iconClassName: 'h-4 w-4',
        link: '/app',
        external: false,
        disabled: false,
      },
      {
        labelKey: 'navigation.items.licenses',
        icon: DeveloperBoardIcon,
        iconClassName: 'h-4 w-4',
        link: '/licenses',
        external: false,
        disabled: false,
      },
      {
        labelKey: 'navigation.items.vehicles',
        icon: CarIcon,
        iconClassName: 'h-4 w-4',
        link: '/vehicles',
        external: false,
        disabled: false,
        // Members read Vehicles through their own wallet, which needs the
        // platform signer check (contracts C5).
        hidden: isMember && !dataAccessEnabled,
      },
      {
        labelKey: 'navigation.items.webhooks',
        icon: IntegrationIcon,
        iconClassName: 'h-4 w-4',
        link: '/webhooks',
        external: false,
        disabled: false,
        // Owner-only (Task 9): a member's webhook outlives their membership,
        // and connection keys are secrets.
        hidden: isMember,
      },
      {
        labelKey: 'navigation.items.templates',
        icon: CarRentalIcon,
        iconClassName: 'h-4 w-4',
        link: '/templates',
        external: false,
        disabled: !TEMPLATE_EDITOR_ENABLED,
      },
      ...(includeConnections
        ? [
            {
              labelKey: 'navigation.items.connections',
              icon: ConnectionsIcon,
              iconClassName: 'h-4 w-4',
              link: '/connections',
              external: false,
              disabled: false,
              // Owner-only (Task 9): a member's webhook outlives their membership,
              // and connection keys are secrets.
              hidden: isMember,
            },
          ]
        : []),
    ],
  },
  {
    labelKey: 'navigation.sections.resources',
    items: [
      {
        labelKey: 'navigation.items.documentation',
        icon: SummarizeIcon,
        iconClassName: 'h-4 w-4',
        link: 'https://dimo.org/docs',
        external: true,
        disabled: false,
      },
      {
        labelKey: 'navigation.items.apiStatus',
        icon: MonitorHeartIcon,
        iconClassName: 'h-4 w-4',
        link: 'https://stats.uptimerobot.com/snU0rkEEah',
        external: true,
        disabled: false,
      },
    ],
  },
];
