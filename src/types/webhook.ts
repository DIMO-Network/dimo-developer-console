import { GetDeveloperLicensesForWebhooksQuery } from '@/gql/graphql';

export interface Webhook {
  id: string;
  service: string;
  metricName: string;
  condition: string;
  coolDownPeriod: number;
  parameters: Record<string, unknown>;
  targetURL: string;
  developer_license_address: string;
  status: string;
  created_at: string;
  updated_at: string;
  description: string;
  displayName?: string;
  failure_count: number;
}

export type WebhookEditableFields = Partial<
  Pick<
    Webhook,
    | 'service'
    | 'metricName'
    | 'condition'
    | 'coolDownPeriod'
    | 'targetURL'
    | 'status'
    | 'description'
    | 'displayName'
  >
>;

export interface CelCondition {
  field: string;
  operator: string;
  value: string;
}
export interface WebhookFormInput {
  service: string;
  coolDownPeriod: number;
  description: string;
  displayName?: string;
  targetURL: string;
  verificationToken?: string;
  cel: {
    operator: string;
    conditions: CelCondition[];
  };
  subscribe?: {
    allVehicles?: boolean;
    assetDIDs?: string[];
  };
}

export type WebhookCreateInput = Omit<WebhookFormInput, 'cel' | 'subscribe'> & {
  status: string;
  metricName: string;
  condition: string;
};

export interface Condition {
  field: string;
  operator: string;
  value: string;
}

export interface AvailableSignal {
  name: string;
  unit: string;
}

export enum WebhookFormStepName {
  CONFIGURE = 'configure',
  DELIVERY = 'delivery',
  SPECIFY_VEHICLES = 'specify_vehicles',
}

export class FormStep {
  private stepName: WebhookFormStepName;
  private title: string;

  constructor(stepName: WebhookFormStepName, title: string) {
    this.stepName = stepName;
    this.title = title;
  }

  getName() {
    return this.stepName;
  }

  getTitle() {
    return this.title;
  }
}

export type DeveloperLicenseForWebhook =
  GetDeveloperLicensesForWebhooksQuery['developerLicenses']['nodes'][0];

export class LocalDeveloperLicense {
  private gqlDeveloperLicense: DeveloperLicenseForWebhook;

  constructor(remoteDeveloperLicense: DeveloperLicenseForWebhook) {
    this.gqlDeveloperLicense = remoteDeveloperLicense;
  }

  get clientId() {
    return this.gqlDeveloperLicense.clientId;
  }

  get label() {
    return this.gqlDeveloperLicense.alias || this.gqlDeveloperLicense.clientId;
  }

  get firstRedirectURI() {
    return this.gqlDeveloperLicense.redirectURIs.nodes[0].uri;
  }
}

export enum EditWebhookFormState {
  EDIT_FORM = 'EDIT_FORM',
  SUBSCRIBE_VEHICLES = 'SUBSCRIBE_VEHICLES',
}
