import {FragmentType, gql, useFragment} from "@/gql";
import React, {FC} from "react";

import '../shared/Styles.css';
import {Title} from "@/components/Title";
import {useSession} from "next-auth/react";
import {RedirectUriList} from "@/components/RedirectUriList";

const REDIRECT_URIS_FRAGMENT = gql(`
  fragment RedirectUriFragment on DeveloperLicense {
    redirectURIs(first:100) {
      nodes {
        uri
      }
    }
  }
`);

interface Props {
  license: FragmentType<typeof REDIRECT_URIS_FRAGMENT>
}

export const RedirectUris: FC<Props> = ({ license }) => {
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};
  const fragment = useFragment(REDIRECT_URIS_FRAGMENT, license);
  return (
    <div className={"license-details-table"}>
      <div className={"license-details-table-header"}>
        <Title component="h2" className={"text-xl"}>Authorized Redirect URIs</Title>
      </div>
      <RedirectUriList
        redirectUris={fragment.redirectURIs.nodes}
        refreshData={() => {}}
        tokenId={}
      />
    </div>
  );
};
