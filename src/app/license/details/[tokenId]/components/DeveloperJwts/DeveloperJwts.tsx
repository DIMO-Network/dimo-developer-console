import { FC } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { Section, SectionHeader } from '@/components/Section';
import { Table } from '@/components/Table';
import { getAllDevJwts } from '@/utils/devJwt';
import { CopyableRow } from '@/components/CopyableRow';
import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import { jwtDecode } from 'jwt-decode';

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
  const jwts = getAllDevJwts(fragment.clientId);

  const columns = [
    {
      name: 'token',
      label: 'JWT',
      render: (item: { token: string }) => {
        const visiblePart = item.token.slice(0, 16);
        const maskedPart = '*'.repeat(32);
        return (
          <CopyableRow
            value={item.token}
            displayText={`${visiblePart}${maskedPart}`}
            onCopySuccessMessage="JWT copied!"
          />
        );
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
        // @ts-expect-error data type
        <Table columns={columns} data={jwts} />
      ) : (
        <p className="text-text-secondary">No developer JWTs found</p>
      )}
    </Section>
  );
};
