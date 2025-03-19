import { type FC } from 'react';
import classNames from 'classnames';

import { BeachAccessIcon, DeveloperBoardIcon } from '@/components/Icons';
import { Card } from '@/components/Card';
import { ENVIRONMENTS_LABELS, IApp } from '@/types/app';

import './AppCard.css';
import {Anchor} from "@/components/Anchor";
import {Button} from "@/components/Button";
import {FragmentType, useFragment} from "@/gql";
import {DeveloperLicenseFragment} from "@/hooks/gql/queries/useGetDeveloperLicenseByTokenIdQuery";

interface IProps extends Partial<IApp> {
  className?: string;
  description?: string;
  onClick?: () => void;
}

const AppIcon = {
  production: <DeveloperBoardIcon className="w-5 h-5" />,
  sandbox: <BeachAccessIcon className="w-5 h-5" />,
};

export const LicenseCard = (props: {license: FragmentType<typeof DeveloperLicenseFragment>, className?: string}) => {
  const license = useFragment(DeveloperLicenseFragment, props.license);

  return (
    <Card className={classNames('app-card', props.className)}>
      <div className="content">
        <div className={"flex w-full flex-row justify-between items-center"}>
          <p className="title">{license.alias}</p>
        </div>
        <Anchor href={`/license/${license.tokenId}`}>
          <Button className={'dark w-full !h-10'}>
            License Details
          </Button>
        </Anchor>
      </div>
    </Card>
  );
};

export const AppCard: FC<IProps> = ({
  name,
  scope = 'production',
  description = '',
  className = '',
  id,
}) => {
  return (
    <Card className={classNames('app-card', className)}>
      <div className="content">
        <div className={"flex w-full flex-row justify-between items-center"}>
          <p className="title">{name}</p>
          {AppIcon[scope || 'sandbox']}
        </div>
        <p className="app-card-description">{description || ENVIRONMENTS_LABELS[scope]}</p>
        <Anchor href={`/app/details/${id}`}>
          <Button className={'dark w-full !h-10'}>
            App Details
          </Button>
        </Anchor>
      </div>
    </Card>
  );
};

export default AppCard;
