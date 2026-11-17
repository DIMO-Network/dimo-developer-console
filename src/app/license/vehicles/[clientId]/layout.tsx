'use client';

import { ReactNode, use } from 'react';
import { gql } from '@/gql';
import { useIdentityQuery } from '@/hooks/useIdentityQuery';
import { Header } from '@/app/license/vehicles/[clientId]/components/Header';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { Loader } from '@/components/Loader';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

const DEVELOPER_LICENSE_BY_CLIENT_ID_SUMMARY = gql(`
  query DeveloperLicenseByClientIdSummary($clientId: Address!) {
    developerLicense(by: {clientId: $clientId}) {
      tokenId
      alias
      clientId
    }
  }
`);

export default function DeveloperLicenseDetailsPageLayout({
  params,
  children,
}: {
  children: ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const { data, loading, error } = useIdentityQuery(
    DEVELOPER_LICENSE_BY_CLIENT_ID_SUMMARY,
    {
      variables: { clientId },
    },
  );
  const router = useRouter();
  const t = useTranslations('license');
  const tCommon = useTranslations('common');

  const onBack = () => {
    router.replace(`/license/${data?.developerLicense?.tokenId ?? ''}/details`);
  };

  return (
    <div>
      {!!error && <p>{t('vehicles.loadError')}</p>}
      {loading && <Loader isLoading={true} />}
      {data?.developerLicense && (
        <div className={'flex flex-col'}>
          <div className={'py-4 self-start'}>
            <button
              aria-label={tCommon('actions.back')}
              className="text-muted transition-colors hover:text-ink"
              onClick={onBack}
            >
              <ChevronLeftIcon className={'h-4 w-4'} />
            </button>
          </div>
          <Header
            tokenId={data?.developerLicense.tokenId ?? 0}
            alias={data?.developerLicense.alias ?? ''}
          />
          <div className={'flex flex-col py-6'}>{children}</div>
        </div>
      )}
    </div>
  );
}
