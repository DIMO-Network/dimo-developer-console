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
  signalName: string;
  description: string;
}

export interface CelCondition {
  field: string;
  operator: string;
  value: string;
}
export interface WebhookFormInput {
  service: string;
  trigger: string;
  setup: string;
  description: string;
  target_uri: string;
  cel: {
    operator: string;
    conditions: CelCondition[];
  };
}

export type WebhookCreateInput = WebhookFormInput & {
  status: string;
  data: string;
};

export interface Condition {
  // id: string;
  field: string;
  operator: string;
  value: string;
}
