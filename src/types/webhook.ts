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
    conditions?: Condition[];

}

export interface Condition {
    field: string;
    operator: string;
    value: string;
}

export interface FormData {
    description: string;
    target_uri: string;
    service: string;
    logic: string;
    setup: string;
    status: string;
    conditions?: Condition[];
}
