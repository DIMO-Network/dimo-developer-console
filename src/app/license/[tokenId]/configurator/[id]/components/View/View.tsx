'use client';

import { useTranslations } from 'next-intl';
import { useIdentityQuery } from '@/hooks/useIdentityQuery';
import { useQuery as useRestQuery } from '@tanstack/react-query';
import { fetchJson } from '@/utils/fetchJson';
import { Loader } from '@/components/Loader';
import { useEffect, useRef, useState } from 'react';
import { PageSubtitle } from '@/components/PageSubtitle';
import { ConfigurationForm } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm';
import { FormProvider, useForm } from 'react-hook-form';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import {
  buildConfiguration,
  toFormValues,
} from '@/app/license/[tokenId]/configurator/utils/configuration';
import { IConfiguration, updateConfiguration } from '@/actions/configurations';
import { DEVELOPER_LICENSE_INFO } from '@/app/license/[tokenId]/configurator/components/ListView/ListView';
import { toast } from 'sonner';
import Link from 'next/link';

export const View = ({
  params,
}: {
  params: Promise<{ tokenId: string; id: string }>;
}) => {
  const t = useTranslations('configurator');
  const [tokenId, setTokenId] = useState<number>();
  const [configurationId, setConfigurationId] = useState<string>();
  const { data, loading, error } = useIdentityQuery(DEVELOPER_LICENSE_INFO, {
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

  const { data: saved, error: loadError } = useRestQuery({
    queryKey: ['configuration', configurationId],
    enabled: !!configurationId,
    // Fill the form once, like a one-shot load: a refetch must not reset edits.
    staleTime: Infinity,
    // Never reuse a past visit's record: saves don't update this cache.
    gcTime: 0,
    refetchOnWindowFocus: false,
    queryFn: () =>
      fetchJson<IConfiguration>(
        `/api/configurations/${encodeURIComponent(configurationId!)}`,
      ),
  });

  const [filled, setFilled] = useState(false);
  const [fillFailed, setFillFailed] = useState(false);
  const filledFor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!saved || !configurationId || filledFor.current === configurationId) return;
    filledFor.current = configurationId;
    try {
      const raw = saved.configuration;
      const savedConfiguration: Record<string, unknown> =
        typeof raw === 'string' ? JSON.parse(raw) : raw;
      reset(toFormValues(savedConfiguration, saved));
      setFilled(true);
    } catch (error) {
      console.error(error);
      setFillFailed(true);
      toast.error(t('edit.loadFailed'));
    }
  }, [saved, configurationId, reset, t]);

  useEffect(() => {
    if (!loadError) return;
    console.error(loadError);
    toast.error(t('edit.loadFailed'));
  }, [loadError, t]);

  const submit = async (data: DynamicFormProps) => {
    try {
      const body = {
        id: configurationId!,
        client_id: data.client_id,
        configuration_name: data.configuration_name,
        configuration: buildConfiguration(data),
      };

      await updateConfiguration(body);

      toast.success(t('edit.updated'));
    } catch (error) {
      console.error(error);
      toast.error(t('edit.updateFailed'));
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
        <p>{t('licenseLoadError')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <nav className="mb-2 flex items-center gap-1.5 text-label text-muted">
        <Link
          href={`/license/${tokenId}/details`}
          className="transition-colors hover:text-ink"
        >
          {t('breadcrumb.licenseDetails')}
        </Link>
        <span>/</span>
        <Link
          href={`/license/${tokenId}/configurator`}
          className="transition-colors hover:text-ink"
        >
          {t('breadcrumb.sdkConfigurator')}
        </Link>
        <span>/</span>
        <span className="text-ink">{t('breadcrumb.editConfiguration')}</span>
      </nav>
      <PageSubtitle subtitle={t('edit.subtitle')} />
      {(loadError || fillFailed) && <p>{t('edit.loadFailed')}</p>}
      {!loadError && !fillFailed && !filled && <Loader isLoading />}
      {data?.developerLicense && filled && (
        <FormProvider {...methods}>
          <ConfigurationForm license={data?.developerLicense} submit={submit} editing />
        </FormProvider>
      )}
    </div>
  );
};

export default View;
