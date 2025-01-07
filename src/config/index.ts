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
  MINIMUM_CREDITS: number;
  masFeePerGas: number;
  gasPrice: number;
  desiredAmountOfDCX: number;
  desiredAmountOfDimo: number;
  ISSUED_TOPIC: `0x${string}`;
};

export const getConfig = (): Configuration => {
  // Determine the current environment
  // TODO: find a better way to determine the environment
  const env = process.env.VERCEL_ENV!;
  const clientEnv = process.env.NEXT_PUBLIC_CE!;

  const environment = env ?? clientEnv;

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
    default:
      environmentConfig = {};
      break;
  }

  return {
    ...defaultConfig,
    ...environmentConfig,
    frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL!,
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL!,
    WMATIC: process.env.NEXT_PUBLIC_WMATIC!,
    DC_ADDRESS: process.env.NEXT_PUBLIC_DC_ADDRESS!,
    DCX_ADDRESS: process.env.NEXT_PUBLIC_DCX_ADDRESS!,
    DLC_ADDRESS: process.env.NEXT_PUBLIC_DLC_ADDRESS!,
    SwapRouterAddress: process.env.NEXT_PUBLIC_SWAP_ROUTER_ADDRESS!,
  } as Configuration;
};

const currentConfig = getConfig();

export default currentConfig;
