import * as defaultConfig from './default';
import * as productionConfig from './production';
import * as previewConfig from './preview';

import type { CONTRACT_METHODS } from './default';

type Configuration = {
  environment: string;
  appName: string;
  LOGIN_PAGES: string[];
  VALIDATION_PAGES: string[];
  API_PATH: string;
  UNPROTECTED_PATHS: string[];
  ROLES: string[];
  REGIONS: string[];
  DEVELOPER_TYPES: string[];
  backendUrl: string;
  frontendUrl: string;
  RAINBOW_PROJECT: Record<string, string>;
  CONTRACT_NETWORK: bigint;
  DLC_ADDRESS: `0x${string}`;
  DC_ADDRESS: `0x${string}`;
  DCX_ADDRESS: `0x${string}`;
  WMATIC: `0x${string}`;
  SwapRouterAddress: `0x${string}`;
  MINIMUM_CREDITS: number;
  masFeePerGas: number;
  gasPrice: number;
  ISSUED_TOPIC: `0x${string}`;
  CONTRACT_METHODS: Record<keyof typeof CONTRACT_METHODS, string>;
  identityApiUrl: string;
};

const getCurrentEnvironment = (): string => {
  let environment = process.env.VERCEL_ENV!;
  if (!environment) {
    environment = process.env.NEXT_PUBLIC_VERCEL_ENV!;
  }
  return environment;
};

export const getConfig = (): Configuration => {
  // Determine the current environment
  const environment = getCurrentEnvironment();
  // Select the appropriate configuration to merge with default based on the environment
  let environmentConfig = {};
  switch (environment) {
    case 'production':
      environmentConfig = productionConfig;
      break;
    case 'preview':
      environmentConfig = previewConfig;
      break;
    // Assuming 'development' should fall back to default
    case 'development':
      // TODO - delete before merging
      environmentConfig = productionConfig;
      break;
    default:
      environmentConfig = {};
      break;
  }

  return {
    environment: environment,
    ...defaultConfig,
    ...environmentConfig,
  } as Configuration;
};

const currentConfig = getConfig();

export default currentConfig;
