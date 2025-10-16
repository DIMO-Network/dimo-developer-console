import { CopyableRow } from '@/components/CopyableRow';
import { Button } from '@/components/Button';
import React, { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { getConfigurationByClientId } from '@/actions/configurations';

export const ClientId = (props: { value: string; tokenId: number }) => {
  const router = useRouter();
  const [configurationId, setConfigurationId] = useState<string>('');
  const [ready, setReady] = useState<boolean>(false);
  useEffect(() => {
    if (!props.value) return;

    const getConfigurationId = async (clientId: string) => {
      try {
        const { id } = await getConfigurationByClientId({ client_id: clientId });
        setConfigurationId(id);
      } catch (error: unknown) {
        if (error instanceof AxiosError) {
          return;
        }
        console.error(error);
      } finally {
        setReady(true);
      }
    };

    void getConfigurationId(props.value);
  }, [props]);

  return (
    <div className="flex flex-row gap-4">
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <p className="text-base text-text-secondary font-medium">Client ID</p>
        <CopyableRow value={props.value} onCopySuccessMessage={'Client ID Copied!'} />
      </div>
      {ready && (
        <Button
          className="dark with-icon px-4"
          onClick={() => {
            router.push(`/license/${props.tokenId}/configurator/${configurationId}`);
          }}
        >
          {configurationId === '' ? 'Configure Login With DIMO' : 'Update Configuration'}
        </Button>
      )}
    </div>
  );
};
