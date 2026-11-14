'use client';
import React, { FC } from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/Button';
import type { BrandView } from '@/services/brand';

interface Props {
  brand: BrandView;
  isMultiple: boolean;
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

export const BrandRow: FC<Props> = ({ brand, isMultiple, isOwner, onEdit, onDelete }) => {
  const t = useTranslations('license');
  // The only brand can go (the license falls back to DIMO's own look). The
  // default among several waits for another default, so one always remains.
  const canDelete = !isMultiple || !brand.isDefault;

  return (
    <div className="flex flex-row items-center justify-between border-b border-outline py-3 last:border-0">
      <div className="flex flex-row items-center gap-2">
        <span className="text-body-sm font-medium text-ink">{brand.name}</span>
        {brand.isDefault && (
          <span className="rounded-chip bg-control px-2 py-0.5 text-label text-muted whitespace-nowrap">
            {t('brandRow.default')}
          </span>
        )}
      </div>
      {isOwner && (
        <div className="flex flex-row gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            title={t('brandRow.edit')}
            onClick={onEdit}
          >
            <PencilIcon className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            title={canDelete ? t('brandRow.delete') : t('brandRow.setDefaultFirst')}
            onClick={onDelete}
            disabled={!canDelete}
          >
            <TrashIcon className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
};
