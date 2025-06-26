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
    vehicleTokenIds?: string[];
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

export interface AvailableSignal {
  name: string;
  unit: string;
}
