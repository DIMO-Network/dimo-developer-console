import { FC, useMemo } from 'react';
import { IWorkspace } from '@/types/workspace';
import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';
import { LicenseCard } from '@/components/LicenseCard';
import EmptyList from '@/app/app/list/components/EmptyList';
import { isOwner } from '@/utils/user';
import CreateAppButton from '@/app/app/list/components/CreateAppButton';
import { DeveloperLicenseByTokenIdDocument } from '@/queries/DeveloperLicenseByTokenId';
import './LicenseList.css';
import { useGlobalAccount } from '@/hooks';

export const LicenseList: FC<{ workspace?: IWorkspace }> = ({ workspace }) => {
  const { currentUser } = useGlobalAccount();
  const { data, error, loading } = useQuery(DeveloperLicenseByTokenIdDocument, {
    variables: { tokenId: workspace?.token_id ?? 0 },
    skip: !workspace?.token_id,
  });

  const MainComponent = useMemo(() => {
    if (error) {
      return <p>We had trouble fetching your Developer Licenses</p>;
    }
    if (loading) {
      return <Loader isLoading={true} />;
    }
    if (data?.developerLicense) {
      return (
        <div className="license-list">
          <LicenseCard license={data.developerLicense} />
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
        {isOwner(currentUser!.role) && !!data?.developerLicense && <CreateAppButton />}
      </div>
      {MainComponent}
    </div>
  );
};
