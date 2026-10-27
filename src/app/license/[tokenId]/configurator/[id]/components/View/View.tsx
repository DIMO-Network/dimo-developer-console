'use client';

import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';
import { useEffect, useState } from 'react';
import { PageSubtitle } from '@/components/PageSubtitle';
import { ConfigurationForm } from '@/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm';
import { FormProvider, useForm } from 'react-hook-form';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import {
  buildConfiguration,
  toFormValues,
} from '@/app/license/[tokenId]/configurator/utils/configuration';
import { getConfiguration, updateConfiguration } from '@/actions/configurations';
import './View.css';
import { DEVELOPER_LICENSE_INFO } from '@/app/license/[tokenId]/configurator/components/ListView/ListView';
import { toast } from 'sonner';
import Link from 'next/link';

export const View = ({
  params,
}: {
  params: Promise<{ tokenId: string; id: string }>;
}) => {
  const [tokenId, setTokenId] = useState<number>();
  const [configurationId, setConfigurationId] = useState<string>();
  const { data, loading, error } = useQuery(DEVELOPER_LICENSE_INFO, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });

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

  const methods = useForm<DynamicFormProps>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      component: 'LoginWithDimo',
    },
  });

  const { reset } = methods;

  useEffect(() => {
    if (!configurationId) return;
    const populateConfiguration = async () => {
      const response = await getConfiguration({ id: configurationId });
      const raw = response.configuration;
      const savedConfiguration: Record<string, unknown> =
        typeof raw === 'string' ? JSON.parse(raw) : raw;
      reset(toFormValues(savedConfiguration, response));
    };

    void populateConfiguration();
  }, [configurationId, reset]);

  const submit = async (data: DynamicFormProps) => {
    try {
      const body = {
        id: configurationId!,
        client_id: data.client_id,
        configuration_name: data.configuration_name,
        configuration: buildConfiguration(data),
      };

      await updateConfiguration(body);

      toast.success('Configuration successfully updated');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update configuration. Please try again.');
    }
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
      <nav className="mb-2 flex items-center gap-1.5 text-label text-muted">
        <Link
          href={`/license/${tokenId}/details`}
          className="transition-colors hover:text-ink"
        >
          License details
        </Link>
        <span>/</span>
        <Link
          href={`/license/${tokenId}/configurator`}
          className="transition-colors hover:text-ink"
        >
          SDK configurator
        </Link>
        <span>/</span>
        <span className="text-ink">Edit configuration</span>
      </nav>
      <PageSubtitle subtitle="Edit configuration" />
      {data?.developerLicense && (
        <FormProvider {...methods}>
          <ConfigurationForm
            license={data?.developerLicense}
            licenseSummary={data?.developerLicense}
            submit={submit}
          />
        </FormProvider>
      )}
    </div>
  );
};

export default View;
