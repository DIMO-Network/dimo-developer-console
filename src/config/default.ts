const { LICENSE_PRICE_USD = 10, DCX_IN_USD = 0.001, DIMO_IN_USD = 0.2 } = process.env;

export const appName = 'Developer Console';

export const LOGIN_PAGES = ['/sign-in', '/sign-up', '/email-recovery'];

// Just a placeholder for redirection purposes
export const VALIDATION_PAGES = ['/valid-tzd', '/verify-email'];

export const API_PATH = '/api';

export const UNPROTECTED_PATHS = ['/api/auth'];

export const ROLES = ['Owner', 'Collaborator'];

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

export const RAINBOW_PROJECT = {
  ID: '528803928611a7781fb6b23eaf232224',
  NAME: 'Dimo Developer Console',
};

// 80002 - POLYGON AMOY
export const CONTRACT_NETWORK = BigInt(80_002);

// DIMO TOKEN AMOY
export const DC_ADDRESS: `0x${string}` =
  '0x21cFE003997fB7c2B3cfe5cf71e7833B7B2eCe10';

// DIMO CREDIT AMOY
export const DCX_ADDRESS: `0x${string}` =
  '0x49c120f4C3c6679Ebd357F2d749E4D1C03598d65';

// DIMO LICENSE AMOY
export const DLC_ADDRESS: `0x${string}` =
  '0xdb6c0dBbaf48b9D9Bcf5ca3C45cFF3811D70eD96';

// WRAPPED MATIC AMOY
export const WMATIC: `0x${string}` =
  '0x360ad4f9a9A8EFe9A8DCB5f461c4Cc1047E1Dcf9';

// SwapRouter AMOY
export const SwapRouterAddress: `0x${string}` =
  '0x52D03752872F30B6AcD26979FD5EB7213bA62DaF';

export const masFeePerGas = 60000000000;
export const gasPrice = 43000000000;

export const desiredAmountOfDimo = Number(LICENSE_PRICE_USD) / Number(DIMO_IN_USD);
export const desiredAmountOfDCX = Number(LICENSE_PRICE_USD) / Number(DCX_IN_USD);

export const DIMO_CREDITS_CONTRACT_ADDRESS =
  '0x7186F9aC35d24c9a4cf1E58a797c04DF1b334322'.toLowerCase();

