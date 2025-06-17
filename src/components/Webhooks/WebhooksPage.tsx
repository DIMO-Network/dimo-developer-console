'use client';

import React from 'react';
import './Webhooks.css';
import { WebhookTable } from './WebhookTable';
import Button from '@/components/Button/Button';
import { Section, SectionHeader } from '@/components/Section';
import Link from 'next/link';
import { gql } from '@/gql';
import { useGlobalAccount } from '@/hooks';
import { useQuery } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { SelectField } from '@/components/SelectField';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { Label } from '@/components/Label';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';

export const DEVELOPER_LICENSES_FOR_WEBHOOKS = gql(`
  query GetDeveloperLicensesForWebhooks($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      nodes {
        alias
        clientId
        redirectURIs(first:100) {
          nodes {
            uri
          }
        }
      }
    }
  }
`);

interface LicenseSelectorForm {
  developerLicense: {
    clientId: string;
    domain: string;
    privateKey: string;
  };
}

export const WebhooksPage = () => {
  const { currentUser } = useGlobalAccount();
  const { data } = useQuery(DEVELOPER_LICENSES_FOR_WEBHOOKS, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });
  const validDeveloperLicenses = data?.developerLicenses.nodes.filter(
    (it) => !!it.redirectURIs.nodes.length,
  );
  const { control, watch, getValues, register, setValue } = useForm<LicenseSelectorForm>({
    defaultValues: { developerLicense: { clientId: '', domain: '', privateKey: '' } },
  });
  const { clientId, domain } = watch('developerLicense');
  const { devJwts, refetch } = useGetDevJwts(clientId);
  const hasValidJwt = devJwts.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-row gap-1 pb-2 border-b-cta-default border-b">
        <p className={'text-base text-text-secondary font-medium'}>
          Receive real-time updates from events
        </p>
      </div>
      <div className={'flex flex-col gap-2.5'}>
        <Label>Select a Developer License</Label>
        <SelectField
          {...register('developerLicense.clientId', {
            required: 'Please choose a Developer License',
            onChange: (e) => {
              const clientId = e.target.value;
              const selected = data?.developerLicenses.nodes.find(
                (l) => l.clientId === clientId,
              );
              if (selected) {
                setValue(
                  'developerLicense.domain',
                  selected.redirectURIs.nodes[0]?.uri ?? '',
                );
                setValue('developerLicense.privateKey', '');
              }
            },
          })}
          control={control}
          options={
            validDeveloperLicenses?.map((license) => ({
              text: license.alias ?? license.clientId,
              value: license.clientId,
            })) ?? []
          }
          value={getValues('developerLicense.clientId')}
          placeholder={'Please choose a developer license'}
        />
      </div>

      {clientId && domain && !hasValidJwt && (
        <div>
          <p className={'text-text-secondary'}>
            Please generate a Developer JWT to view your webhook configurations.
          </p>
          <GenerateDevJWT
            clientId={clientId}
            domain={domain}
            onSuccess={refetch}
            buttonClassName="mt-2"
          />
        </div>
      )}

      {hasValidJwt && (
        <Section>
          <SectionHeader title={'Webhooks'}>
            <Link href={`/webhooks/create/${clientId}`}>
              <Button className="dark with-icon">+ Create a webhook</Button>
            </Link>
          </SectionHeader>
          <WebhookTable clientId={clientId} />
        </Section>
      )}
    </div>
  );
};
