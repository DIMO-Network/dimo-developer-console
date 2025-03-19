import { useSession } from 'next-auth/react';
import { type FC } from 'react';

import {AppCard, LicenseCard} from '@/components/AppCard';
import { IApp } from '@/types/app';
import { isOwner } from '@/utils/user';

import './AppList.css';
import EmptyList from '@/app/app/list/components/EmptyList';
import CreateAppButton from '@/app/app/list/components/CreateAppButton';
import {IWorkspace} from "@/types/workspace";
import {useGetDeveloperLicenseByTokenId} from "@/hooks/gql/queries/useGetDeveloperLicenseByTokenIdQuery";

interface IProps {
  apps: IApp[];
}

export const LicenseList: FC<{workspace?: IWorkspace}> = ({workspace}) => {
  const {data: session} = useSession();
  const {user: {role = ''} = {}} = session ?? {};
  const {data: license, error, loading} = useGetDeveloperLicenseByTokenId(workspace?.token_id, {skip: !workspace?.token_id});

  const renderItem = (licenseQuery) => {
    const license = licenseQuery.developerLicense;
    return (
      <LicenseCard name={license.alias} tokenId={license.tokenId} key={license.tokenId}/>
    );
  };

  const licenses = [license].filter(it => !!it);
  return (
    <div className="app-list-content">
      <div className="description">
        <p className="title">Your Developer Licenses</p>
        {isOwner(role) && !!workspace?.token_id && (
          <CreateAppButton />
        )}
      </div>
      {workspace?.token_id ? <div className="app-list">{licenses.map(renderItem)}</div> :
        <div className={"empty-list"}><EmptyList/></div>}
    </div>
  );
};

export const AppList: FC<IProps> = ({apps}) => {
  const {data: session} = useSession();
  const {user: {role = ''} = {}} = session ?? {};

  const renderItem = (app: IApp, idx: number) => {
    return (
      <AppCard key={app.id ?? idx} className="hover:!border-white" {...app} />
    );
  };

  return (
    <div className="app-list-content">
      <div className="description">
        <p className="title">Your Apps</p>
        {isOwner(role) && !!apps.length && (
          <CreateAppButton />
        )}
      </div>
      {apps.length ? <div className="app-list">{apps.map(renderItem)}</div> : <div className={"empty-list"}><EmptyList /></div>}
    </div>
  );
};

export default AppList;
