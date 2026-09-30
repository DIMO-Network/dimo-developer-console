'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useValidDeveloperLicenses } from '@/components/Webhooks/hooks/useValidDeveloperLicenses';
import { DevLicenseSelector } from '@/components/Webhooks/components/DeveloperLicenseSelector';
import { VehicleDetailsTable } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { Section, SectionHeader } from '@/components/Section';
import { TextField } from '@/components/TextField';
import { LocalDeveloperLicense } from '@/types/webhook';

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

const parseSearch = (raw: string): { owner?: string; tokenIdSearch: number | null } => {
  const s = raw.trim();
  if (/^\d+$/.test(s)) return { tokenIdSearch: Number(s) };
  if (ADDRESS.test(s)) return { owner: s, tokenIdSearch: null };
  return { tokenIdSearch: null };
};

const Content = () => {
  const { developerLicenses, loading } = useValidDeveloperLicenses();
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
        <p className="text-body text-fg">
          Create a developer license to see the vehicles shared with it.
        </p>
        <Link href="/licenses" className="text-body-sm text-ink underline">
          Go to licenses
        </Link>
      </Section>
    );
  }

  const filters = parseSearch(search);
  return (
    <>
      <DevLicenseSelector
        developerLicenses={developerLicenses}
        onChange={select}
        selectedLicense={selected}
      />
      {selected && (
        <Section>
          <SectionHeader title="Shared vehicles">
            <TextField
              placeholder="Search by token ID or owner address"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              wrapperClassName="md:w-80"
              aria-label="Search vehicles"
            />
          </SectionHeader>
          <div className="-mx-4 -mb-4">
            <VehicleDetailsTable
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
  const { loading, error } = useValidDeveloperLicenses();
  return (
    <div className="flex flex-col gap-6">
      <QueryPageWrapper
        loading={loading}
        error={error}
        customErrorMessage="There was a problem fetching your developer licenses"
      >
        <Content />
      </QueryPageWrapper>
    </div>
  );
};
