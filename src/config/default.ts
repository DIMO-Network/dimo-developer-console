export const appName = 'Developer Console';

export const LOGIN_PAGES = ['/sign-in', '/sign-up', '/email-recovery'];

// Just a placeholder for redirection purposes
export const VALIDATION_PAGES = ['/valid-tzd', '/verify-email'];

export const API_PATH = '/api';

export const UNPROTECTED_PATHS = ['/api/auth'];

export const ROLES = ['Collaborator'];

export const REGIONS = [
  'North America',
  'Latin America & Caribbean',
  'Oceania',
  'Northern & Western Europe',
  'Africa',
  'East & Southeast Asia',
  'Middle East & Central Asia ',
  'South Asia',
  'Eastern Europe',
];

export const DEVELOPER_TYPES = [
  'Personal Developer',
  'OEM',
  'Insurance',
  'Maintenance',
  'Fleet Management',
  'Vehicle Sales',
  'Utilities',
  'Financing',
  'EV',
  'DePIN',
  'Data',
  'Others',
];

export const backendUrl = 'http://localhost:3001/';

export const frontendUrl = 'http://localhost:3000/';

export const identityApiUrl = 'https://identity-api.dev.dimo.zone/query';

export const RAINBOW_PROJECT = {
  ID: '528803928611a7781fb6b23eaf232224',
  NAME: 'Dimo Developer Console',
};

// 80002 - POLYGON AMOY
export const CONTRACT_NETWORK = BigInt(80_002);

// DIMO TOKEN AMOY
export const DC_ADDRESS: `0x${string}` = '0x21cFE003997fB7c2B3cfe5cf71e7833B7B2eCe10';

// DIMO CREDIT AMOY
export const DCX_ADDRESS: `0x${string}` = '0x49c120f4C3c6679Ebd357F2d749E4D1C03598d65';

// DIMO LICENSE AMOY
export const DLC_ADDRESS: `0x${string}` = '0xdb6c0dBbaf48b9D9Bcf5ca3C45cFF3811D70eD96';

// WRAPPED MATIC AMOY
export const WMATIC: `0x${string}` = '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9';

// SwapRouter AMOY
export const SwapRouterAddress: `0x${string}` =
  '0x52D03752872F30B6AcD26979FD5EB7213bA62DaF';

export const masFeePerGas = 60000000000;
export const gasPrice = 43000000000;

export const MINIMUM_CREDITS = 10000;

export const DIMO_CONTRACT_ADDRESS = '0x523d4a08cf149f1Ada8113B3b3400234236Bb5E8';

export const ISSUED_TOPIC: `0x${string}` =
  '0x7533f62ec6601bf9c87f8d96bf756b4b495e2a0e26ec9284e4927926ed6b3afd';

export const CONTRACT_METHODS = {
  ISSUE_IN_DC: '0x69054339',
  MINT_IN_DIMO: '0xec88fc37',
  APPROVE_ALLOWANCE: '0x095ea7b3',
  MINT_DCX: '0x40c10f19',
  MINT_CONNECTION: '0xd0def521',
};

export const DIMO_ESCROW_ADDRESS = '0xA302e4A4B5B7c85cE68266619ec7b5c52e94F260';

export const DIMO_SACD_ADDRESS = '0x4E5F9320b1c7cB3DE5ebDD760aD67375B66cF8a3';

export const DCC_ADDRESS = '0x41799E9Dc893722844E771a1C1cAf3BBc2876132'; // Connections
