import { FC } from 'react';
import { LicenseCard } from '@/components/LicenseCard';
import EmptyList from '@/app/app/list/components/EmptyList';
import { FragmentType, gql, useFragment } from '@/gql';
import './LicenseList.css';

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

  return (
    <div className="license-list-content">
      <div className="description">
        <p className="title">Your Developer Licenses</p>
      </div>
      {fragment.nodes.length ? (
        <div className="license-list">
          {fragment.nodes.map((licenseSummaryFragment, idx) => (
            <LicenseCard license={licenseSummaryFragment} key={idx} />
          ))}
        </div>
      ) : (
        <EmptyList />
      )}
    </div>
  );
};
