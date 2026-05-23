'use client';
import React, { FC } from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
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
  const canDelete = !brand.isDefault || !isMultiple;

  return (
    <div className="flex flex-row items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex flex-row items-center gap-2">
        <span className="font-medium">{brand.name}</span>
        {brand.isDefault && (
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cta-default text-white whitespace-nowrap">
            Default
          </span>
        )}
      </div>
      {isOwner && (
        <div className="flex flex-row gap-2">
          <Button
            type="button"
            className="table-action-button"
            title="Edit brand"
            onClick={onEdit}
          >
            <PencilIcon className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            className="table-action-button"
            title={
              canDelete
                ? 'Delete brand'
                : 'Set another brand as default before deleting this one'
            }
            onClick={onDelete}
            disabled={!canDelete}
          >
            <TrashIcon className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
};
