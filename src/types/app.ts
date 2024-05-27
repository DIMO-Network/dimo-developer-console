type ENVIRONMENTS = 'production' | 'sandbox';

export interface ISigner {
  [k: string]: string;
  wallet: string;
  key: string;
}

export interface IApp {
  name: string;
  scope: ENVIRONMENTS;
  client_id: string;
  signers: ISigner[];
}
