import {FC, useMemo} from "react";
import {IWorkspace} from "@/types/workspace";
import {useSession} from "next-auth/react";
import {useGetDeveloperLicenseByTokenId} from "@/hooks/gql/queries/useGetDeveloperLicenseByTokenIdQuery";
import {Loader} from "@/components/Loader";
import {LicenseCard} from "@/components/AppCard";
import EmptyList from "@/app/app/list/components/EmptyList";
import {isOwner} from "@/utils/user";
import CreateAppButton from "@/app/app/list/components/CreateAppButton";

import './AppList.css';

export const LicenseList: FC<{ workspace?: IWorkspace }> = ({workspace}) => {
  const {data: session} = useSession();
  const {user: {role = ''} = {}} = session ?? {};
  const {data, error, loading} = useGetDeveloperLicenseByTokenId(workspace?.token_id, {skip: !workspace?.token_id});

  const MainComponent = useMemo(() => {
    if (error) {
      return (
        <p>We had trouble fetching your Developer Licenses</p>
      );
    }
    if (loading) {
      return (
        <Loader isLoading={true}/>
      );
    }
    if (data?.developerLicense) {
      return (
        <div className="app-list"><LicenseCard license={data.developerLicense}/></div>
      );
    }
    return (
      <div className={"empty-list"}><EmptyList/></div>
    );
  }, [data, error, loading]);

  return (
    <div className="app-list-content">
      <div className="description">
        <p className="title">Your Developer Licenses</p>
        {isOwner(role) && !!data?.developerLicense && (
          <CreateAppButton/>
        )}
      </div>
      {MainComponent}
    </div>
  );
};
