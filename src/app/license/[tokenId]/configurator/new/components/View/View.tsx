'use client';

import { useQuery } from '@apollo/client';
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
  const [tokenId, setTokenId] = useState<number>();
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

      toast.success('Configuration successfully created');

      router.replace(`/license/${tokenId}/configurator/${id}`);
    } catch (error) {
      console.log(error);
      toast.error('Failed to create configuration. Please try again.');
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
        <span className="text-ink">New configuration</span>
      </nav>
      <PageSubtitle subtitle="New configuration" />
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
