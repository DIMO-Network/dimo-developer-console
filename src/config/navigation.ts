import { type FC } from 'react';
import { ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline';

import {
  APIIcon,
  HomeIcon,
  IntegrationIcon,
  MonitorHeartIcon,
  SettingsIcon,
  SummarizeIcon,
  SupportAgentIcon,
} from '@/components/Icons';

export const mainMenu = [
  {
    label: 'Home',
    icon: HomeIcon,
    iconClassName: 'h-5 w-5',
    link: '/',
  },
  {
    label: 'Integrations',
    icon: IntegrationIcon,
    iconClassName: 'h-5 w-5 fill-white stroke-white stroke-1',
    link: '/integrations',
  },
  {
    label: 'Support',
    icon: SupportAgentIcon,
    iconClassName: 'h-5 w-5',
    link: '/support',
  },
  {
    label: 'API Reference',
    icon: APIIcon,
    iconClassName: 'h-5 w-5',
    link: '/api-reference',
  },
  {
    label: 'Documentation',
    icon: SummarizeIcon,
    iconClassName: 'h-5 w-5',
    link: '/docs',
  },
  {
    label: 'API Status',
    icon: MonitorHeartIcon,
    iconClassName: 'h-5 w-5',
    link: '/api-status',
  },
];

export const bottomMenu = [
  {
    label: 'Logout',
    icon: ArrowLeftStartOnRectangleIcon as FC,
    iconClassName: 'h-5 w-5 fill-grey-200',
    link: '/api/auth/logout',
  },
  {
    label: 'Settings',
    icon: SettingsIcon,
    iconClassName: 'h-5 w-5 fill-grey-200',
    link: '/settings',
  },
];
