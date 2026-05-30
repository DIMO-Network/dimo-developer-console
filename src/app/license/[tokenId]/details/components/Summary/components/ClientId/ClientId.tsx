import { CopyableRow } from '@/components/CopyableRow';
import React from 'react';

export const ClientId = (props: { value: string; tokenId: number }) => {
  return (
    <div className="flex flex-row gap-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <p className="text-base text-text-secondary font-medium shrink-0">Client ID</p>
        <div className="min-w-0">
          <CopyableRow value={props.value} onCopySuccessMessage={'Client ID Copied!'} />
        </div>
      </div>
    </div>
  );
};
