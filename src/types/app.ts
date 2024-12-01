import { IWorkspace } from './workspace';

type ENVIRONMENTS = 'production' | 'sandbox';

export enum ENVIRONMENTS_LABELS {
  production = 'Production',
  sandbox = 'Sandbox',
}

export interface ISigner {
  [k: string]: string | undefined;
  id?: string;
  api_key: string;
  address: string;
  app_id: string;
  company_id: string;
}

export interface IRedirectUri {
  [k: string]: string | boolean | undefined;
  id?: string;
  uri: string;
  status: boolean;
  app_id: string;
  company_id: string;
}

export interface IApp {
  id?: string;
  name: string;
  scope: ENVIRONMENTS;
  Workspace: Partial<IWorkspace>;
  RedirectUris?: IRedirectUri[];
  Signers?: ISigner[];
  deleted: boolean;
}

export interface IAppWithWorkspace {
  app: IApp;
  workspace: Partial<IWorkspace>;
}
