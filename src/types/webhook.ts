import { GetDeveloperLicensesForWebhooksQuery } from '@/gql/graphql';

export interface Webhook {
  id: string;
  service: string;
  data: string;
  trigger: string;
  setup: string;
  parameters: Record<string, unknown>;
  target_uri: string;
  developer_license_address: string;
  status: string;
  created_at: string;
  updated_at: string;
  description: string;
  failure_count: number;
}

export type WebhookEditableFields = Partial<
  Pick<
    Webhook,
    'service' | 'data' | 'trigger' | 'setup' | 'target_uri' | 'status' | 'description'
  >
>;

export interface CelCondition {
  field: string;
  operator: string;
  value: string;
}
export interface WebhookFormInput {
  service: string;
  setup: string;
  description: string;
  target_uri: string;
  verification_token?: string;
  cel: {
    operator: string;
    conditions: CelCondition[];
  };
  subscribe?: {
    allVehicles?: boolean;
    file?: File;
  };
}

export type WebhookCreateInput = Omit<WebhookFormInput, 'cel' | 'subscribe'> & {
  status: string;
  data: string;
  trigger: string;
};

export interface Condition {
  field: string;
  operator: string;
  value: string;
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
  private remoteDeveloperLicense: DeveloperLicenseForWebhook;

  constructor(remoteDeveloperLicense: DeveloperLicenseForWebhook) {
    this.remoteDeveloperLicense = remoteDeveloperLicense;
  }

  get clientId() {
    return this.remoteDeveloperLicense.clientId;
  }

  get label() {
    return this.remoteDeveloperLicense.alias || this.remoteDeveloperLicense.clientId;
  }

  get firstRedirectURI() {
    return this.remoteDeveloperLicense.redirectURIs.nodes[0].uri;
  }
}
