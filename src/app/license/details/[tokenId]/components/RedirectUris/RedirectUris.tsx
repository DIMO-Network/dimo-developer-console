import {FragmentType, gql} from "@/gql";
import React, {FC} from "react";

import '../shared/Styles.css';
import {Title} from "@/components/Title";
import {useSession} from "next-auth/react";

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
  redirectUris: FragmentType<typeof REDIRECT_URIS_FRAGMENT>
}
export const RedirectUris: FC<Props> = ({ redirectUris }) => {
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};
  return (
    <div className={"license-details-table"}>
      <div className={"license-details-table-header"}>
        <Title component="h2" className={"text-xl"}>Authorized Redirect URIs</Title>
      </div>
    </div>
  );
};
