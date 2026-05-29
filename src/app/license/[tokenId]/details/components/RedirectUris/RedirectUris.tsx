import { FragmentType, gql, useFragment } from '@/gql';
import React, { FC, useState } from 'react';
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
  const [optimisticAdditions, setOptimisticAdditions] = useState<string[]>([]);
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(new Set());

  const displayUris = [
    ...fragment.redirectURIs.nodes.filter((n) => !pendingRemovals.has(n.uri)),
    ...optimisticAdditions
      .filter((uri) => !fragment.redirectURIs.nodes.some((n) => n.uri === uri))
      .map((uri) => ({ uri })),
  ];

  const handleAdded = (uri: string) => {
    setOptimisticAdditions((prev) => [...prev, uri]);
    refetch().then(() => setOptimisticAdditions([]));
  };

  const handleRemoved = (uri: string) => {
    setPendingRemovals((prev) => new Set([...prev, uri]));
    refetch().then(() => setPendingRemovals(new Set()));
  };

  return (
    <CollapsibleSection>
      <CollapsibleSection.Title title={'Authorized Redirect URIs'} />
      <CollapsibleSection.Content>
        {isLicenseOwner && (
          <div>
            <RedirectUriForm
              tokenId={fragment.tokenId}
              refreshData={refetch}
              redirectUris={displayUris}
              owner={fragment.owner}
              onAdded={handleAdded}
            />
          </div>
        )}
        {!!displayUris.length && (
          <RedirectUriList
            isOwner={isLicenseOwner}
            redirectUris={displayUris}
            refreshData={refetch}
            tokenId={fragment.tokenId}
            onRemoved={handleRemoved}
          />
        )}
      </CollapsibleSection.Content>
    </CollapsibleSection>
  );
};
