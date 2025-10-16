'use server';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export interface IConfiguration {
  id: string;
  configuration_name: string;
  configuration: Record<string, unknown>;
}

export const getConfigurationByClientId = async ({
  client_id,
}: {
  client_id: string;
}): Promise<{ id: string }> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<IConfiguration>(
    `/api/my/configurations?clientId=${client_id}`,
  );

  return { id: data.id };
};

export const getConfiguration = async ({
  id,
}: {
  id: string;
}): Promise<IConfiguration> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<{ configuration: IConfiguration }>(
    `/api/my/configurations/${id}`,
  );
  return data.configuration;
};

export const saveConfiguration = async ({
  client_id,
  configuration_name,
  configuration,
}: {
  client_id: string;
  configuration_name: string;
  configuration: Record<string, unknown>;
}): Promise<{ id: string }> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post(`/api/my/configurations`, {
    client_id,
    configuration_name,
    configuration,
  });

  return { id: data.id };
};

export const updateConfiguration = async ({
  id,
  client_id,
  configuration_name,
  configuration,
}: {
  id: string;
  client_id: string;
  configuration_name: string;
  configuration: Record<string, unknown>;
}) => {
  const client = await dimoDevAPIClient();
  const {} = await client.put(`/api/my/configurations/${id}`, {
    client_id,
    configuration_name,
    configuration,
  });
};
