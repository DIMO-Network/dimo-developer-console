import {FragmentType, useFragment} from "@/gql";
import {DeveloperLicenseSummaryFragment} from "@/queries/DeveloperLicenseByTokenId";
import {Card} from "@/components/Card";
import classNames from "classnames";
import {Anchor} from "@/components/Anchor";
import {Button} from "@/components/Button";

import './LicenseCard.css';

export const LicenseCard = (props: {
  license: FragmentType<typeof DeveloperLicenseSummaryFragment>,
  className?: string
}) => {
  const license = useFragment(DeveloperLicenseSummaryFragment, props.license);

  return (
    <Card className={classNames('license-card', props.className)}>
      <div className="content">
        <div className={"flex w-full flex-row justify-between items-center"}>
          <p className="title">{license.alias}</p>
        </div>
        <Anchor href={`/license/details/${license.tokenId}`}>
          <Button className={'dark w-full !h-10'}>
            License Details
          </Button>
        </Anchor>
      </div>
    </Card>
  );
};
