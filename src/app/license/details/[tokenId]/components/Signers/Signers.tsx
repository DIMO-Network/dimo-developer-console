import {gql} from "@/gql";
import {Title} from "@/components/Title";
import React, {useState} from "react";
import {isOwner} from "@/utils/user";
import {Button} from "@/components/Button";
import {KeyIcon} from "@heroicons/react/20/solid";
import {useSession} from "next-auth/react";

import '../shared/Styles.css';

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
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};
  const handleGenerateSigner = () => {

  };
  return (
    <div className={"license-details-table"}>
      <div className={"license-details-table-header"}>
        <Title component="h2" className={"text-xl"}>API Keys</Title>
        {isOwner(role) && (
            <Button
              className="dark with-icon px-4"
              loading={isLoading}
              loadingColor="primary"
              onClick={() => handleGenerateSigner()}
            >
              <KeyIcon className="w-4 h-4" />
              Generate Key
            </Button>
        )}
      </div>
      <div>
        <SignersTable />
      </div>
    </div>
  );
};

const SignersTable = () => {
  return null;
};
