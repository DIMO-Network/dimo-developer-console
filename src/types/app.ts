import { IWorkspace } from './workspace';

type ENVIRONMENTS = 'production' | 'sandbox';

export interface ISigner {
  [k: string]: string;
  wallet: string;
  key: string;
}

export interface IRedirectUri {
  [k: string]: string;
  redirectUri: string;
  status: 'active' | 'inactive';
}

export interface IApp {
  name: string;
  scope: ENVIRONMENTS;
  client_id: string;
  signers?: ISigner[];
  redirectUris?: IRedirectUri[];
}

export interface IAppWithWorkspace {
  app: IApp;
  workspace: Partial<IWorkspace>;
}
