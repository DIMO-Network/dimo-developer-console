import { FC } from 'react';
import { LicenseCard } from '@/components/LicenseCard';
import EmptyList from '@/app/app/list/components/EmptyList';
import CreateAppButton from '@/app/app/list/components/CreateAppButton';
import { FragmentType, gql, useFragment } from '@/gql';
import { useTeam } from '@/hooks/useTeam';
import './LicenseList.css';

const MAX_LICENSES = 5;

export const GET_LICENSE_SUMMARIES = gql(`
  fragment DeveloperLicenseSummariesOnConnection on DeveloperLicenseConnection {
    nodes {
      ...DeveloperLicenseSummaryFragment
    }
  }
`);

interface Props {
  licenseConnection: FragmentType<typeof GET_LICENSE_SUMMARIES>;
}

export const LicenseList: FC<Props> = ({ licenseConnection }) => {
  const fragment = useFragment(GET_LICENSE_SUMMARIES, licenseConnection);
  const atLimit = fragment.nodes.length > MAX_LICENSES;

  const { isMember, activeTeam } = useTeam();

  return (
    <div className="license-list-content">
      <div className="description">
        <p className="title">
          {isMember
            ? `${activeTeam?.name ?? 'Team'} licenses`
            : 'Your developer licenses'}
        </p>
        {!isMember && <CreateAppButton disabled={atLimit} />}
      </div>
      {fragment.nodes.length ? (
        <div className="license-list">
          {fragment.nodes.map((licenseSummaryFragment, idx) => (
            <LicenseCard license={licenseSummaryFragment} key={idx} />
          ))}
        </div>
      ) : isMember ? (
        <div className="flex w-full flex-1 flex-col items-center justify-center rounded-card bg-card p-10 text-center">
          <p className="text-card-title text-ink">
            This team has no developer licenses yet
          </p>
          <p className="mt-1 text-body-sm text-muted">
            Licenses the team owner creates show up here.
          </p>
        </div>
      ) : (
        <EmptyList />
      )}
    </div>
  );
};
