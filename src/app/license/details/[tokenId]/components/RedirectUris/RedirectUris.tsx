import {FragmentType, gql} from "@/gql";
import {FC} from "react";

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
  return null;
};
