import { FragmentType, gql, useFragment } from '@/gql';
import React, { FC } from 'react';
import { RedirectUriList } from '@/components/RedirectUriList';
import { RedirectUriForm } from '@/components/RedirectUriForm';

import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { useRedirectUris } from '../redirectUriOverlay';

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
  const { uris: displayUris, recordUriChange } = useRedirectUris(
    fragment.redirectURIs.nodes,
  );

  return (
    <div className="flex flex-col gap-4 rounded-card bg-card p-4 text-fg">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center md:gap-0">
        <h2 className="text-card-title text-ink">Authorized redirect URIs</h2>
      </div>
      <div className="flex flex-col gap-4">
        {isLicenseOwner && (
          <div>
            <RedirectUriForm
              tokenId={fragment.tokenId}
              refreshData={refetch}
              redirectUris={displayUris}
              owner={fragment.owner}
              onAdded={(uri) => recordUriChange(uri, true)}
            />
          </div>
        )}
        {!!displayUris.length && (
          <div className="-mx-4 -mb-4">
            <RedirectUriList
              isOwner={isLicenseOwner}
              redirectUris={displayUris}
              refreshData={refetch}
              tokenId={fragment.tokenId}
              onRemoved={(uri) => recordUriChange(uri, false)}
            />
          </div>
        )}
      </div>
    </div>
  );
};
