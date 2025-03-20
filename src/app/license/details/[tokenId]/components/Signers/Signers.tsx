import {gql} from "@/gql";

const SIGNERS_FRAGMENT = gql(`
  fragment SignerFragment on DeveloperLicense {
    signers(first:100) {
      nodes {
        address
      }
    }
  }
`);

export const Signers = () => {

}
