'use client';

import { useTranslations } from 'next-intl';
import { useIdentityQuery } from '@/hooks/useIdentityQuery';
import { Loader } from '@/components/Loader';
import { useEffect, useState } from 'react';
import { PageSubtitle } from '@/components/PageSubtitle';
import { ConfigurationForm } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm';
import { FormProvider, useForm } from 'react-hook-form';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import { buildConfiguration } from '@/app/license/[tokenId]/configurator/utils/configuration';
import { saveConfiguration } from '@/actions/configurations';
import { useRouter } from 'next/navigation';
import { DEVELOPER_LICENSE_INFO } from '@/app/license/[tokenId]/configurator/components/ListView/ListView';
import { toast } from 'sonner';
import Link from 'next/link';

export const View = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const t = useTranslations('configurator');
  const [tokenId, setTokenId] = useState<number>();
  const { data, loading, error } = useIdentityQuery(DEVELOPER_LICENSE_INFO, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });
  const router = useRouter();

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    void getTokenId();
  }, [params]);

  const methods = useForm<DynamicFormProps>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      component: 'ShareVehiclesWithDimo',
      permissionsMode: 'template',
      language: '',
      emailRequest: 'optional',
    },
  });

  const submit = async (data: DynamicFormProps) => {
    try {
      const body = {
        client_id: data.client_id,
        configuration_name: data.configuration_name,
        configuration: buildConfiguration(data),
      };

      const { id } = await saveConfiguration(body);

      toast.success(t('new.created'));

      router.replace(`/license/${tokenId}/configurator/${id}`);
    } catch (error) {
      console.log(error);
      toast.error(t('new.createFailed'));
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
        <p>{t('list.loadError')}</p>
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
        <span className="text-ink">{t('breadcrumb.newConfiguration')}</span>
      </nav>
      <PageSubtitle subtitle={t('new.subtitle')} />
      {data?.developerLicense && (
        <FormProvider {...methods}>
          <ConfigurationForm license={data?.developerLicense} submit={submit} />
        </FormProvider>
      )}
    </div>
  );
};

export default View;
