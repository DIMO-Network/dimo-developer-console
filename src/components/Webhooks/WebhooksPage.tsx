'use client';

import React, { useCallback, useEffect, useState } from 'react';
import './Webhooks.css';
import { useWebhooks } from '@/hooks/useWebhooks';
import { WebhookTable } from './WebhookTable';
import Button from '@/components/Button/Button';
import { Section, SectionHeader } from '@/components/Section';
import Link from 'next/link';
import { gql } from '@/gql';
import { useGlobalAccount } from '@/hooks';
import { useQuery } from '@apollo/client';
import { useForm } from 'react-hook-form';
import { SelectField } from '@/components/SelectField';
import { GenerateDevJWTModal } from '@/components/GenerateDevJWTModal';
import { getDevJwt } from '@/utils/devJwt';

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

const useGetDevJwt = (clientId: string) => {
  const [devJwt, setDevJwt] = useState('');

  const refetch = useCallback(() => {
    if (clientId) {
      const item = getDevJwt(clientId);
      if (item) {
        setDevJwt(item);
      }
    }
  }, [clientId]);

  useEffect(() => {
    refetch();
  }, [clientId, refetch]);

  return {
    devJwt,
    refetch,
  };
};

export const WebhooksPage = () => {
  const [showGenerateJwtModal, setShowGenerateJwtModal] = useState(false);
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
  const { devJwt, refetch } = useGetDevJwt(clientId);

  const { setCurrentWebhook, expandedWebhook, setExpandedWebhook } = useWebhooks();

  return (
    <div className="webhooks-container">
      <GenerateDevJWTModal
        isOpen={showGenerateJwtModal}
        setIsOpen={setShowGenerateJwtModal}
        tokenParams={{ client_id: clientId, domain: domain }}
        onSuccess={refetch}
      />
      <div className="flex flex-row gap-1 pb-2 border-b-cta-default border-b">
        <p className={'text-base text-text-secondary font-medium'}>
          Receive real-time updates from events
        </p>
      </div>
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
      {clientId && domain && !devJwt && (
        <div className={'pt-8'}>
          <p className={'text-text-secondary'}>
            Please generate a Developer JWT to view your webhook configurations.
          </p>
          <Button className={'mt-2'} onClick={() => setShowGenerateJwtModal(true)}>
            Generate developer JWT
          </Button>
        </div>
      )}

      {!!devJwt && (
        <div className="py-6">
          <Section>
            <SectionHeader title={'Webhooks'}>
              <Link href={`/webhooks/create/${clientId}`}>
                <Button className="dark with-icon">+ Create a webhook</Button>
              </Link>
            </SectionHeader>
            <WebhookTable
              onEdit={setCurrentWebhook}
              clientId={clientId}
              onDelete={() => {
                // setWebhookToDelete(webhook);
                // setShowDeleteConfirm(true);
              }}
              onTest={() => {
                // setWebhookToTest(webhook);
                // setShowTestModal(true);
              }}
              expandedWebhook={expandedWebhook}
              setExpandedWebhook={setExpandedWebhook}
            />
          </Section>
        </div>
      )}
    </div>
  );
};
