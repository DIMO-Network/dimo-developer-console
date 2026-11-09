'use client';

import { useIdentityQuery } from '@/hooks/useIdentityQuery';
import { Loader } from '@/components/Loader';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PageSubtitle } from '@/components/PageSubtitle';
import { ConfigurationList } from '@/app/license/[tokenId]/configurator/components/ConfigurationList';
import { useFragment } from '@/gql';
import { gql } from '@/gql';
import { USER_CONFIG_FRAGMENT } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { OwnerAction } from '@/components/OwnerOnly';

export const DEVELOPER_LICENSE_INFO = gql(`
  query DeveloperLicenseInfo($tokenId: Int!) {
    developerLicense(by: {tokenId: $tokenId}) {
      ...DeveloperLicenseSummaryFragment
      ...SignerFragment
      ...RedirectUriFragment
      ...DeveloperLicenseVehiclesFragment
      ...DeveloperJwtsFragment
      ...UserConfigurationFragment
    }
  }
`);

export const ListView = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const t = useTranslations('configurator');
  const [tokenId, setTokenId] = useState<number>();
  const router = useRouter();

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    void getTokenId();
  }, [params]);

  const { data, loading, error } = useIdentityQuery(DEVELOPER_LICENSE_INFO, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });

  const fragment = useFragment(USER_CONFIG_FRAGMENT, data?.developerLicense ?? null);

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
        <span className="text-ink">{t('breadcrumb.sdkConfigurator')}</span>
      </nav>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <PageSubtitle subtitle={t('list.subtitle')} />
        <OwnerAction licenseOwner={fragment?.owner}>
          <Button
            variant="primary"
            className="shrink-0 whitespace-nowrap px-4"
            onClick={() => router.push(`/license/${tokenId}/configurator/new`)}
          >
            {t('list.newConfiguration')}
          </Button>
        </OwnerAction>
      </div>
      <p className="mb-4 text-body-sm text-muted">
        {t.rich('list.intro', {
          docsLink: (chunks) => (
            <a
              href="https://www.dimo.org/docs/build/building-with-tools/client-sdk-dimo-connect"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline underline-offset-2"
            >
              {chunks}
            </a>
          ),
        })}
      </p>
      {fragment?.clientId && tokenId && (
        <ConfigurationList
          clientId={fragment.clientId}
          tokenId={tokenId}
          owner={fragment.owner}
        />
      )}
    </div>
  );
};

export default ListView;
