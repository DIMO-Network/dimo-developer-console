'use client';
import { FC } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { shortAddress } from '@/services/subjects/did';
import { SelectWithChevron } from '@/components/SelectWithChevron';
import type { LocalDeveloperLicense } from '@/types/webhook';
import type { VehicleDetail } from '@/services/subjects/graph';
import { useFreshnessText } from '@/hooks/useFreshnessText';

export const VehicleHeader: FC<{
  vehicle: VehicleDetail;
  licenses: LocalDeveloperLicense[];
  selected?: LocalDeveloperLicense;
  onSelectLicense: (clientId: string) => void;
}> = ({ vehicle, licenses, selected, onSelectLicense }) => {
  const t = useTranslations('vehicles');
  const { utcDate } = useFreshnessText();
  const name =
    [vehicle.definition?.make, vehicle.definition?.model, vehicle.definition?.year]
      .filter(Boolean)
      .join(' ') || t('header.fallbackName', { tokenId: String(vehicle.tokenId) });
  return (
    <div className="flex flex-col gap-3">
      <nav
        className="flex items-center gap-1.5 text-label text-muted"
        aria-label={t('header.breadcrumb')}
      >
        <Link href="/vehicles" className="transition-colors hover:text-ink">
          {t('header.vehicles')}
        </Link>
        <span>/</span>
        <span className="text-ink">{vehicle.tokenId}</span>
      </nav>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-title text-ink">{name}</h1>
            <span className="rounded-chip bg-control px-2 py-0.5 text-label text-muted">
              #{vehicle.tokenId}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-label text-muted">
            <span>
              {t.rich('header.owner', {
                short: shortAddress(vehicle.owner),
                address: (chunks) => (
                  <span className="font-mono text-code text-fg">{chunks}</span>
                ),
              })}
            </span>
            <span>{t('header.minted', { date: utcDate(vehicle.mintedAt) })}</span>
          </div>
        </div>
        {licenses.length > 0 && (
          <div className="flex items-center gap-2.5">
            <span className="text-label text-muted">{t('header.license')}</span>
            <SelectWithChevron
              name="license"
              className="min-w-[210px]"
              options={licenses.map((l) => ({ value: l.clientId, label: l.label }))}
              value={selected?.clientId ?? ''}
              onChange={(e) => onSelectLicense(e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
