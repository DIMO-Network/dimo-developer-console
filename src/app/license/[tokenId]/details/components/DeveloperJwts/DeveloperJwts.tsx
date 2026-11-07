'use client';
import { FC, useEffect, useState } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { Table } from '@/components/Table';
import { removeDevJwt } from '@/utils/devJwt';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { jwtDecode } from 'jwt-decode';
import { useFormatter, useTranslations } from 'next-intl';
import { Button } from '@/components/Button';
import { TrashIcon } from '@heroicons/react/24/outline';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { CopyButton } from '@/components/CopyButton';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import { useRedirectUris } from '../redirectUriOverlay';
import { useEventEmitter } from '@/hooks/useEventEmitter';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { useDimoAuth } from '@/hooks/useDimoAuth';

export const DEVELOPER_JWTS_FRAGMENT = gql(`
  fragment DeveloperJwtsFragment on DeveloperLicense {
    owner
    clientId
    redirectURIs(first:100) {
      nodes {
        uri
      }
    }
  }
`);

interface Props {
  license: FragmentType<typeof DEVELOPER_JWTS_FRAGMENT>;
}

export const DeveloperJwts: FC<Props> = ({ license }) => {
  const t = useTranslations('license');
  const format = useFormatter();
  const fragment = useFragment(DEVELOPER_JWTS_FRAGMENT, license);
  const { uris: redirectUris } = useRedirectUris(fragment.redirectURIs.nodes);
  const { devJwts, refetch } = useGetDevJwts(fragment.clientId);
  const [jwtToDelete, setJwtToDelete] = useState<string>();
  const isLicenseOwner = useIsLicenseOwner(fragment);
  const { getGlobalAccountDeveloperJwt } = useDimoAuth();
  const { publishEvent: publishJwtUpdated } = useEventEmitter<unknown>(
    'developer-jwt-updated',
  );
  const { eventData } = useEventEmitter<{ client_id: `0x${string}` }>(
    'generate-my-developer-jwt',
  );

  const handleDelete = (token: string) => {
    removeDevJwt(fragment.clientId, token);
    refetch();
    publishJwtUpdated({}, true);
  };

  const handleGenerateSuccess = () => {
    refetch();
    publishJwtUpdated({}, true);
  };

  const renderCopyButton = (item: { token: string }) => (
    <CopyButton
      key={`item_${item.token}_copy_button`}
      value={item.token}
      onCopySuccessMessage={t('jwts.copied')}
      size="icon"
    />
  );

  const renderDeleteButton = (item: { token: string }) => (
    <Button
      key={`item_${item.token}_delete_button`}
      variant="secondary"
      size="icon"
      title={t('jwts.deleteLabel')}
      type="button"
      onClick={() => setJwtToDelete(item.token)}
    >
      <TrashIcon className="h-5 w-5" />
    </Button>
  );

  const formatDateTime = (value: number) =>
    format.dateTime(new Date(value), { dateStyle: 'medium', timeStyle: 'short' });

  const columns = [
    {
      name: 'token',
      label: t('jwts.columns.jwt'),
      render: (item: { token: string }) => {
        const visibleStart = item.token.slice(0, 16);
        const visibleEnd = item.token.slice(-4);
        const maskedPart = '*'.repeat(28);
        return (
          <span className="font-mono text-code">{`${visibleStart}${maskedPart}${visibleEnd}`}</span>
        );
      },
    },
    {
      name: 'createdAt',
      label: t('jwts.columns.createdAt'),
      render: (item: { createdAt: number }) => (
        <span>{formatDateTime(item.createdAt)}</span>
      ),
    },
    {
      name: 'expiresAt',
      label: t('jwts.columns.expiresAt'),
      render: (item: { token: string }) => {
        try {
          const { exp } = jwtDecode<{ exp?: number }>(item.token);
          if (exp) {
            return <span>{formatDateTime(exp * 1000)}</span>;
          }
          return <span>{t('jwts.unknownExpiry')}</span>;
        } catch {
          return <span>{t('jwts.invalidToken')}</span>;
        }
      },
    },
  ];

  const processEventData = async () => {
    try {
      if (!eventData) return;
      if (devJwts.length > 0) return;
      const domain = redirectUris[0]?.uri ?? undefined;
      if (!domain) return;
      const success = await getGlobalAccountDeveloperJwt({
        clientId: fragment.clientId,
        domain: domain,
      });
      if (success) handleGenerateSuccess();
    } catch (error) {
      console.error('Error processing event data', error);
    }
  };

  useEffect(() => {
    void processEventData();
  }, [eventData]);

  if (!isLicenseOwner) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 rounded-card bg-card p-4 text-fg">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center md:gap-0">
        <h2 className="text-card-title text-ink">{t('jwts.title')}</h2>
        <GenerateDevJWT
          clientId={fragment.clientId}
          domain={redirectUris[0]?.uri ?? undefined}
          buttonText={t('jwts.generateNew')}
          onSuccess={handleGenerateSuccess}
        />
      </div>
      <div>
        {devJwts.length > 0 ? (
          <div className="-mx-4 -mb-4">
            <Table
              columns={columns}
              data={devJwts}
              actions={[renderCopyButton, renderDeleteButton]}
            />
          </div>
        ) : (
          <p className="text-muted">{t('jwts.empty')}</p>
        )}
        <DeleteConfirmationModal
          isOpen={!!jwtToDelete}
          title={t('jwts.deleteTitle')}
          subtitle=""
          onConfirm={() => {
            if (jwtToDelete) {
              handleDelete(jwtToDelete);
              setJwtToDelete(undefined);
            }
          }}
          onCancel={() => setJwtToDelete(undefined)}
          confirmButtonClassName="error"
        />
      </div>
    </div>
  );
};
