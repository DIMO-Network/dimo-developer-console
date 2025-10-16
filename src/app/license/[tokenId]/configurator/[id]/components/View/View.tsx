'use client';

import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';
import { useEffect, useState } from 'react';
import { PageSubtitle } from '@/components/PageSubtitle';
import { ConfigurationForm } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm';
import { FormProvider, useForm } from 'react-hook-form';
import {
  ComponentType,
  DynamicFormProps,
  PERMISSIONS,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import { getConfiguration, saveConfiguration } from '@/actions/configurations';
import { useRouter } from 'next/router';
import './View.css';
import { DEVELOPER_LICENSE_INFO } from '@/app/license/[tokenId]/configurator/components/View/View';

const parseArray = (val?: string) =>
  val
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const tryParseJSON = (val?: string) => {
  try {
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
};

const formatComponent = (component: ComponentType) => {
  switch (component) {
    case 'LoginWithDimo':
      return 'EMAIL_INPUT';
    case 'ShareVehiclesWithDimo':
      return 'VEHICLE_MANAGER';
    case 'ExecuteAdvancedTransactionWithDimo':
      return 'ADVANCED_TRANSACTION';
  }
};

function formatDate(date?: Date) {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${yyyy}`;
}

const buildJson = (values: DynamicFormProps): Record<string, unknown> => {
  const params: Record<string, unknown> = {};
  const add = (key: string, val: unknown) => {
    if (val === undefined || val === null || val === '') return;
    if (Array.isArray(val)) {
      if (val.length === 0) return;
      params[key] = val.join(',');
    } else if (typeof val === 'object') {
      params[key] = JSON.stringify(val);
    } else {
      params[key] = String(val);
    }
  };

  // Shared
  //add('clientId', values.client_id);
  add('redirectUri', values.redirectUri);
  add('entryState', formatComponent(values.component));
  add('utm', values.utm);
  add(
    'expirationDate',
    values.expirationDate ? formatDate(new Date(values.expirationDate)) : undefined,
  );

  if (values.component === 'LoginWithDimo') {
    add('vehicles', parseArray(values.vehicles));
    add('vehicleMakes', parseArray(values.vehicleMakes));
    add('powerTrainTypes', parseArray(values.powerTrainTypes));
  }

  if (values.component === 'ShareVehiclesWithDimo') {
    if (values.permissionsMode === 'template') {
      add('permissionTemplateId', values.permissionTemplateId);
    } else if (values.permissionsMode === 'custom') {
      const permissionValues = PERMISSIONS.map((p) => {
        const k = values.permissions?.find((vp) => vp === p.key);
        if (k) return '1';
        return '0';
      });
      add('permissions', permissionValues?.join(''));
    }
  }

  if (values.component === 'ExecuteAdvancedTransactionWithDimo') {
    add('value', values.value);
    add('abi', tryParseJSON(values.abi as string));
    add('functionName', values.functionName);
    add('args', parseArray(values.args as string));
  }

  return params;
};

export const View = ({
  params,
}: {
  params: Promise<{ tokenId: string; id: string }>;
}) => {
  const [tokenId, setTokenId] = useState<number>();
  const [configurationId, setConfigurationId] = useState<string>();
  const [configuration, setConfiguration] = useState<DynamicFormProps>();
  const { data, loading, error } = useQuery(DEVELOPER_LICENSE_INFO, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });
  const router = useRouter();

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    const getConfigurationId = async () => {
      const { id: configurationId } = await params;
      setConfigurationId(configurationId);
    };
    void getTokenId();
    void getConfigurationId();
  }, [params]);

  useEffect(() => {
    if (!configurationId) return;
    const populateConfiguration = async () => {
      const saveConfiguration = await getConfiguration({ id: configurationId });
      setConfiguration({
        component: 'LoginWithDimo',
        configuration_name: saveConfiguration.configuration_name,
        ...saveConfiguration.configuration,
      } as DynamicFormProps);
      console.info(configuration);
    };

    void populateConfiguration();
  }, [configurationId]);

  const methods = useForm<DynamicFormProps>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      component: 'LoginWithDimo',
    },
  });

  const submit = async (data: DynamicFormProps) => {
    const body = {
      client_id: data.client_id,
      configuration_name: data.configuration_name,
      configuration: buildJson(data),
    };

    const { id } = await saveConfiguration(body);

    router.replace(`/license/${tokenId}/configurator/${id}`);
  };

  if (loading) {
    return (
      <div className="license-details-page">
        <Loader isLoading={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="license-details-page">
        <p>There was an error fetching the license details</p>
      </div>
    );
  }

  return (
    <div className="liwd-configurator-page">
      <PageSubtitle subtitle="Login With DIMO Configurator" />
      {data?.developerLicense && (
        <FormProvider {...methods}>
          <ConfigurationForm license={data?.developerLicense} submit={submit} />
        </FormProvider>
      )}
    </div>
  );
};

export default View;
