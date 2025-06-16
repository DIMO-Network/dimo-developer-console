import { FC, useState } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { Section, SectionHeader } from '@/components/Section';
import { Table } from '@/components/Table';
import { getAllDevJwts, removeDevJwt } from '@/utils/devJwt';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { jwtDecode } from 'jwt-decode';
import { Button } from '@/components/Button';
import { TrashIcon } from '@heroicons/react/24/outline';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { CopyButton } from '@/components/CopyButton';

export const DEVELOPER_JWTS_FRAGMENT = gql(`
  fragment DeveloperJwtsFragment on DeveloperLicense {
    clientId
  }
`);

interface Props {
  license: FragmentType<typeof DEVELOPER_JWTS_FRAGMENT>;
}

export const DeveloperJwts: FC<Props> = ({ license }) => {
  const fragment = useFragment(DEVELOPER_JWTS_FRAGMENT, license);
  const [jwts, setJwts] = useState(getAllDevJwts(fragment.clientId));
  const [jwtToDelete, setJwtToDelete] = useState<string>();

  const handleDelete = (token: string) => {
    removeDevJwt(fragment.clientId, token);
    setJwts(getAllDevJwts(fragment.clientId));
  };

  const renderCopyRedirectUriAction = (item: { token: string }) => (
    <CopyButton
      value={item.token}
      onCopySuccessMessage="JWT copied!"
      className="button table-action-button"
    />
  );

  const renderDeleteRedirectUriAction = (item: { token: string }) => (
    <Button
      className="table-action-button"
      title="Delete JWT"
      type="button"
      onClick={() => setJwtToDelete(item.token)}
    >
      <TrashIcon className="w-5 h-5" />
    </Button>
  );

  const columns = [
    {
      name: 'token',
      label: 'JWT',
      render: (item: { token: string }) => {
        const visiblePart = item.token.slice(0, 16);
        const maskedPart = '*'.repeat(32);
        return <span>{`${visiblePart}${maskedPart}`}</span>;
      },
    },
    {
      name: 'createdAt',
      label: 'Created',
      render: (item: { createdAt: number }) => (
        <span>{new Date(item.createdAt).toLocaleString()}</span>
      ),
    },
    {
      name: 'expiresAt',
      label: 'Expires At',
      render: (item: { token: string }) => {
        try {
          const { exp } = jwtDecode<{ exp?: number }>(item.token);
          if (exp) {
            return <span>{new Date(exp * 1000).toLocaleString()}</span>;
          }
          return <span>Unknown</span>;
        } catch {
          return <span>Invalid</span>;
        }
      },
    },
  ];

  return (
    <Section>
      <SectionHeader title="Developer JWTs">
        <GenerateDevJWT
          clientId={fragment.clientId}
          domain=""
          buttonText="Generate new JWT"
        />
      </SectionHeader>
      {jwts.length > 0 ? (
        <Table
          columns={columns}
          // @ts-expect-error data type
          data={jwts}
          actions={[renderCopyRedirectUriAction, renderDeleteRedirectUriAction]}
        />
      ) : (
        <p className="text-text-secondary">No developer JWTs found</p>
      )}
      <DeleteConfirmationModal
        isOpen={!!jwtToDelete}
        title="Are you sure you want to delete this JWT?"
        subtitle="You will no longer be able to use this JWT in your app."
        onConfirm={() => {
          if (jwtToDelete) {
            handleDelete(jwtToDelete);
            setJwtToDelete(undefined);
          }
        }}
        onCancel={() => setJwtToDelete(undefined)}
        confirmButtonClassName="error"
      />
    </Section>
  );
};
