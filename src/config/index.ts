import * as defaultConfig from './default';
import * as productionConfig from './production';
import * as previewConfig from './preview';

type Configuration = {
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
  masFeePerGas: number;
  gasPrice: number;
  desiredAmountOfDCX: number;
  desiredAmountOfDimo: number;
};

export const getConfig = (): Configuration => {
  // Determine the current environment
  const env = process.env.VERCEL_ENV;

  // Select the appropriate configuration to merge with default based on the environment
  let environmentConfig = {};
  switch (env) {
    case 'production':
      environmentConfig = productionConfig;
      break;
    case 'preview':
      environmentConfig = previewConfig;
      break;
    // Assuming 'development' should fall back to default
    case 'development':
    default:
      environmentConfig = {};
      break;
  }

  // Use lodash to deeply merge the default configuration with the environment-specific configuration
  return {
    ...defaultConfig,
    ...environmentConfig,
  } as Configuration;
};

export default getConfig();
