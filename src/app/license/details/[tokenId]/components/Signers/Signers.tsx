import {gql} from "@/gql";

const SIGNERS_FRAGMENT = gql(`
  fragment SignersFragment on Signer {
    address
  }
`);

export const Signers = () => {

}
