import {FC, useMemo} from "react";
import {IWorkspace} from "@/types/workspace";
import {useQuery} from "@apollo/client";
import {useSession} from "next-auth/react";
import {Loader} from "@/components/Loader";
import {LicenseCard} from "@/components/LicenseCard";
import EmptyList from "@/app/app/list/components/EmptyList";
import {isOwner} from "@/utils/user";
import CreateAppButton from "@/app/app/list/components/CreateAppButton";
import {gql} from "@/gql";
import './LicenseList.css';
import {getFromSession, GlobalAccountSession} from "@/utils/sessionStorage";
import {IGlobalAccountSession} from "@/types/wallet";

const GET_DEVELOPER_LICENSES_BY_OWNER = gql(`
    query GetDeveloperLicensesByOwner($owner: Address!) {
        developerLicenses(first: 100, filterBy: { owner: $owner }) {
          nodes {
            ...DeveloperLicenseSummaryFragment          
          }
        }
    }
`);

export const LicenseList: FC<{ workspace?: IWorkspace }> = () => {
  const {data: session} = useSession();
  const {user: {role = ''} = {}} = session ?? {};
  const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
  const ownerAddress = gaSession?.organization.smartContractAddress;
  const {data, error, loading} = useQuery(GET_DEVELOPER_LICENSES_BY_OWNER, {
    variables:{owner: ownerAddress ?? ''},
    skip: !ownerAddress,
  });

  const MainComponent = useMemo(() => {
    if (error) {
      return <p>We had trouble fetching your Developer Licenses</p>;
    }
    if (loading) {
      return <Loader isLoading={true} />;
    }
    if (data?.developerLicenses.nodes.length) {
      return (
        <div className="license-list">
          {data.developerLicenses.nodes.map((license, idx) => <LicenseCard license={license} key={idx} />)}
        </div>
      );
    }
    return (
      <div className={'empty-list'}>
        <EmptyList />
      </div>
    );
  }, [data, error, loading]);

  return (
    <div className="license-list-content">
      <div className="description">
        <p className="title">Your Developer Licenses</p>
        {isOwner(role) && !!data?.developerLicenses.nodes.length && (
          <CreateAppButton/>
        )}
      </div>
      {MainComponent}
    </div>
  );
};
