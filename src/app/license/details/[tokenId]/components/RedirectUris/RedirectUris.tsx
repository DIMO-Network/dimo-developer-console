import { FragmentType, gql, useFragment } from '@/gql';
import React, { FC } from 'react';
import { RedirectUriList } from '@/components/RedirectUriList';
import { RedirectUriForm } from '@/components/RedirectUriForm';

import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { CollapsibleSection } from '@/components/CollapsibleSection';

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
  refetch: () => Promise<void>;
}

export const RedirectUris: FC<Props> = ({ license, refetch }) => {
  const fragment = useFragment(REDIRECT_URIS_FRAGMENT, license);
  const isLicenseOwner = useIsLicenseOwner(fragment);
  return (
    <CollapsibleSection>
      <CollapsibleSection.Title title={'Authorized Redirect URIs'} />
      <CollapsibleSection.Content>
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
      </CollapsibleSection.Content>
    </CollapsibleSection>
  );
};
