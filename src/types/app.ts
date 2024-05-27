type ENVIRONMENTS = 'production' | 'sandbox';

export interface IApp {
  name: string;
  scope: ENVIRONMENTS;
  client_id: string;
}
