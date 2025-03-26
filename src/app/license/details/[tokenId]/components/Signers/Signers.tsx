import { FragmentType, gql, useFragment } from '@/gql';
import { Title } from '@/components/Title';
import React, { FC, useState } from 'react';
import { Button } from '@/components/Button';
import { KeyIcon } from '@heroicons/react/20/solid';

import '../shared/Styles.css';
import { isLicenseOwner } from '@/utils/sessionStorage';

const SIGNERS_FRAGMENT = gql(`
  fragment SignerFragment on DeveloperLicense {
    owner
    tokenId
    signers(first:100) {
      nodes {
        address
      }
    }
  }
`);

interface Props {
  license: FragmentType<typeof SIGNERS_FRAGMENT>;
}

export const Signers: FC<Props> = ({ license }) => {
  const [isLoading,] = useState(false);
  const fragment = useFragment(SIGNERS_FRAGMENT, license);
  const handleGenerateSigner = () => {};
  return (
    <div className={'license-details-table'}>
      <div className={'license-details-table-header'}>
        <Title component="h2" className={'text-xl'}>
          API Keys
        </Title>
        {isLicenseOwner(fragment) && (
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
