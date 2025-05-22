import { FragmentType, gql, useFragment } from '@/gql';
import React, { FC } from 'react';
import { RedirectUriList } from '@/components/RedirectUriList';
import { RedirectUriForm } from '@/components/RedirectUriForm';

import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { Section, SectionHeader } from '@/components/Section';

const REDIRECT_URIS_FRAGMENT = gql(`
  fragment RedirectUriFragment on DeveloperLicense {
    owner
    tokenId
    redirectURIs(first:100) {
      nodes {
        uri
      }
    }
  }
`);

interface Props {
  license: FragmentType<typeof REDIRECT_URIS_FRAGMENT>;
  refetch: () => void;
}

export const RedirectUris: FC<Props> = ({ license, refetch }) => {
  const fragment = useFragment(REDIRECT_URIS_FRAGMENT, license);
  const isLicenseOwner = useIsLicenseOwner(fragment);
  return (
    <Section>
      <SectionHeader title={'Authorized Redirect URIs'} />
      {isLicenseOwner && (
        <div>
          <RedirectUriForm
            tokenId={fragment.tokenId}
            refreshData={refetch}
            redirectUris={fragment.redirectURIs.nodes}
            owner={fragment.owner}
          />
        </div>
      )}
      {!!fragment.redirectURIs.nodes.length && (
        <RedirectUriList
          isOwner={isLicenseOwner}
          redirectUris={fragment.redirectURIs.nodes}
          refreshData={refetch}
          tokenId={fragment.tokenId}
        />
      )}
    </Section>
  );
};
