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
}

export interface Condition {
    field: string;
    operator: string;
    value: string;
}
