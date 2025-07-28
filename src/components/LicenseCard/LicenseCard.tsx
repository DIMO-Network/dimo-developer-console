import { FragmentType, gql, useFragment } from '@/gql';
import { Card } from '@/components/Card';
import classNames from 'classnames';
import { Anchor } from '@/components/Anchor';
import { Button } from '@/components/Button';

import './LicenseCard.css';
import { useQuery } from '@apollo/client';
import { GET_VEHICLE_COUNT_BY_CLIENT_ID } from '@/app/license/details/[tokenId]/components/Vehicles';
import { BubbleLoader } from '@/components/BubbleLoader';
import { WarningAmberIcon } from '@/components/Icons';

export const DEVELOPER_LICENSE_SUMMARY_FRAGMENT = gql(`
  fragment DeveloperLicenseSummaryFragment on DeveloperLicense {
    alias
    tokenId
    clientId
    owner
  }
`);

const NoVehiclesWarning = ({ clientId }: { clientId: `0x${string}` }) => {
  const { data, loading, error } = useQuery(GET_VEHICLE_COUNT_BY_CLIENT_ID, {
    variables: { clientId: clientId },
  });

  if (loading) {
    return <BubbleLoader isLoading isSmall />;
  }
  if (error) {
    return <></>;
  }

  const totalVehicles = data?.vehicles?.totalCount ?? 0;

  if (totalVehicles > 0) {
    return <></>;
  }

  return (
    <div className="flex flex-row items-center justify-center gap-2">
      <WarningAmberIcon className="w-6 h-6" />
      No vehicles connected
    </div>
  );
};

export const LicenseCard = (props: {
  license: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT>;
  className?: string;
}) => {
  const license = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, props.license);

  return (
    <Card className={classNames('license-card', props.className)}>
      <div className="content">
        <div className={'flex w-full flex-row justify-between items-center'}>
          <p className="title">{license.alias}</p>
          <NoVehiclesWarning clientId={license.clientId} />
        </div>
        <Anchor href={`/license/details/${license.tokenId}`}>
          <Button className={'dark w-full !h-10'}>License Details</Button>
        </Anchor>
      </div>
    </Card>
  );
};
