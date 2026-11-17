'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { VehicleDetailsTable } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { Section, SectionHeader } from '@/components/Section';
import { TextField } from '@/components/TextField';
import { DevJwtPrompt } from '@/components/DataAccess';
import { useLicenseDataAccess } from '@/hooks/useLicenseDataAccess';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { useTeam } from '@/hooks/useTeam';
import { LocalDeveloperLicense } from '@/types/webhook';
import { TEAM_DATA_ACCESS_ENABLED } from '@/utils/featureFlags';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const parseSearch = (raw: string): { owner?: string; tokenIdSearch: number | null } => {
  const s = raw.trim();
  if (/^\d+$/.test(s)) {
    // GraphQL Int: anything larger cannot be a token ID.
    return Number(s) <= 2147483647
      ? { tokenIdSearch: Number(s) }
      : { tokenIdSearch: null };
  }
  if (ADDRESS.test(s)) return { owner: s, tokenIdSearch: null };
  return { tokenIdSearch: null };
};

// The license query is skipped (not loading, no licenses) until the user's
// smart contract address is known; count that time as loading.
const useLicenses = () => {
  const { currentUser } = useGlobalAccount();
  const result = useValidDeveloperLicenses();
  return { ...result, loading: result.loading || !currentUser?.smartContractAddress };
};

const Content = () => {
  const t = useTranslations('vehicles');
  const { isMember } = useTeam();
  const { developerLicenses, hasLicenseWithoutRedirectUri, loading } = useLicenses();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('license') ?? '';
  const [search, setSearch] = useState('');

  const selected = useMemo<LocalDeveloperLicense | undefined>(() => {
    const byUrl = developerLicenses.find(
      (l) => l.clientId.toLowerCase() === fromUrl.toLowerCase(),
    );
    if (byUrl) return byUrl;
    return developerLicenses.length === 1 ? developerLicenses[0] : undefined;
  }, [developerLicenses, fromUrl]);

  const { isAuthenticatedAsDev, refetch: refetchJwts } = useGetDevJwts(
    selected?.clientId,
  );
  const dataAccess = useLicenseDataAccess(selected);

  const select = (license: LocalDeveloperLicense) => {
    router.replace(`${pathname}?license=${license.clientId}`, { scroll: false });
  };

  useEffect(() => {
    if (
      !loading &&
      selected &&
      selected.clientId.toLowerCase() !== fromUrl.toLowerCase()
    ) {
      select(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, selected?.clientId, fromUrl]);

  if (!loading && developerLicenses.length === 0) {
    return (
      <Section>
        {isMember ? (
          <p className="text-body text-fg">
            {hasLicenseWithoutRedirectUri
              ? t('list.licensesNeedRedirectUri')
              : t('list.teamNoLicenses')}
          </p>
        ) : (
          <>
            <p className="text-body text-fg">
              {hasLicenseWithoutRedirectUri
                ? t('list.addRedirectUri')
                : t('list.createLicense')}
            </p>
            <Link href="/licenses" className="text-body-sm text-ink underline">
              {t('list.goToLicenses')}
            </Link>
          </>
        )}
      </Section>
    );
  }

  const filters = parseSearch(search);
  const invalidSearch =
    search.trim() !== '' && filters.owner === undefined && filters.tokenIdSearch === null;
  return (
    <>
      <DevLicenseSelector
        developerLicenses={developerLicenses}
        onChange={select}
        selectedLicense={selected}
      />
      {selected && (
        <Section>
          <SectionHeader title={t('list.sharedVehicles')}>
            <TextField
              placeholder={t('list.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              wrapperClassName="md:w-80"
              aria-label={t('list.searchLabel')}
            />
          </SectionHeader>
          {invalidSearch && (
            <p className="text-label text-muted">{t('list.invalidSearch')}</p>
          )}
          {(!isAuthenticatedAsDev || dataAccess.kind.startsWith('member-')) && (
            <DevJwtPrompt
              license={selected}
              access={dataAccess}
              onSuccess={refetchJwts}
              message={t('list.jwtMessage')}
            />
          )}
          <div className="-mx-4 -mb-4">
            <VehicleDetailsTable
              // A new JWT remounts the rows so each Last seen cell asks again.
              key={`${selected.clientId}:${filters.owner ?? ''}:${filters.tokenIdSearch ?? ''}:${isAuthenticatedAsDev}`}
              clientId={selected.clientId}
              owner={filters.owner}
              tokenIdSearch={filters.tokenIdSearch}
              showSources
              showLastSeen
            />
          </div>
        </Section>
      )}
    </>
  );
};

export const VehiclesView = () => {
  const t = useTranslations('vehicles');
  const tCommon = useTranslations('common');
  const { loading, error } = useLicenses();
  const { isMember } = useTeam();
  if (isMember && !TEAM_DATA_ACCESS_ENABLED) {
    return (
      <Section>
        <p className="text-body text-fg">{tCommon('teamCopy.dataAccessUnavailable')}</p>
      </Section>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <QueryPageWrapper
        loading={loading}
        error={error}
        customErrorMessage={t('list.licensesError')}
      >
        <Content />
      </QueryPageWrapper>
    </div>
  );
};
