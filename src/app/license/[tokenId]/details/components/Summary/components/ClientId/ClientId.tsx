import { CopyableRow } from '@/components/CopyableRow';
import { Button } from '@/components/Button';
import React from 'react';
import { useRouter } from 'next/navigation';

export const ClientId = (props: { value: string; tokenId: number }) => {
  const router = useRouter();
  return (
    <div className="flex flex-row gap-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <p className="text-base text-text-secondary font-medium">Client ID</p>
        <CopyableRow value={props.value} onCopySuccessMessage={'Client ID Copied!'} />
      </div>
      <Button
        className="dark with-icon px-4"
        onClick={() => {
          router.push(`/license/${props.tokenId}/liwd-configurator`);
        }}
      >
        Configure Login With DIMO
      </Button>
    </div>
  );
};
