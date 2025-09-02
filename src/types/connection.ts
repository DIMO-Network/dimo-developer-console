export interface Connection {
  name: string;
  developer_license_address: string;
  connection_public_key: string;
  connection_private_key: string;
  device_issuance_key: string;
}

export interface ConnectionAddress {
  address: string;
  owner: string;
}
