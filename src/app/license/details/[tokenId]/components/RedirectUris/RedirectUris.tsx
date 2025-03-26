import { FragmentType, gql, useFragment } from '@/gql';
import React, { FC } from 'react';

import '../shared/Styles.css';
import { Title } from '@/components/Title';
import { RedirectUriList } from '@/components/RedirectUriList';
import { RedirectUriForm } from '@/components/RedirectUriForm';

import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';

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
    <div className={'license-details-section'}>
      <div className={'license-details-section-header'}>
        <Title component="h2" className={'text-xl'}>
          Authorized Redirect URIs
        </Title>
      </div>
      {isLicenseOwner && (
        <div>
          <RedirectUriForm
            tokenId={fragment.tokenId}
            refreshData={refetch}
            redirectUris={fragment.redirectURIs.nodes}
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
    </div>
  );
};
