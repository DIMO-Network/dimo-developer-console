import { useEffect, useState } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { Card } from '@/components/Card';
import classNames from 'classnames';
import { Anchor } from '@/components/Anchor';
import { Button } from '@/components/Button';
import { useQuery } from '@apollo/client';
import { BubbleLoader } from '@/components/BubbleLoader';
import { ContentCopyIcon, WarningAmberIcon } from '@/components/Icons';
import { GET_VEHICLE_COUNT_BY_CLIENT_ID } from '@/app/license/[tokenId]/details/components/Vehicles';
import { getConfigurationByClientId } from '@/actions/configurations';

import './LicenseCard.css';

export const DEVELOPER_LICENSE_SUMMARY_FRAGMENT = gql(`
  fragment DeveloperLicenseSummaryFragment on DeveloperLicense {
    alias
    tokenId
    clientId
    owner
  }
`);

const DIMO_LOGIN_BASE =
  process.env.NEXT_PUBLIC_VERCEL_ENV === 'production'
    ? 'https://login.dimo.org'
    : 'https://login.dev.dimo.org';

export const LicenseCard = (props: {
  license: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT>;
  className?: string;
}) => {
  const license = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, props.license);

  const { data: vehicleData, loading: vehicleLoading } = useQuery(
    GET_VEHICLE_COUNT_BY_CLIENT_ID,
    {
      variables: { clientId: license.clientId },
    },
  );

  const [sharingLink, setSharingLink] = useState<string | null>(null);
  const [sharingLinkLoading, setSharingLinkLoading] = useState(true);

  useEffect(() => {
    if (!license.clientId) return;
    getConfigurationByClientId({ client_id: license.clientId }).then(({ id }) => {
      setSharingLink(id ? `${DIMO_LOGIN_BASE}/?configurationId=${id}` : null);
      setSharingLinkLoading(false);
    });
  }, [license.clientId]);

  const vehicleCount = vehicleData?.vehicles?.totalCount ?? 0;
  const hasVehicles = vehicleCount > 0;

  return (
    <Card className={classNames('license-card', props.className)}>
      <div className="content">
        {/* Header */}
        <div className="flex w-full flex-row justify-between items-start">
          <p className="title">{license.alias}</p>
          <span className="text-[10px] font-mono text-text-secondary">
            #{license.tokenId}
          </span>
        </div>

        {/* Stats */}
        <div className="flex flex-row items-center gap-4 py-2 border-y border-[#322D2F]">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-text-secondary">
              Vehicles Connected
            </span>
            {vehicleLoading ? (
              <BubbleLoader isLoading isSmall />
            ) : (
              <Anchor href={`/license/vehicles/${license.clientId}`}>
                <span className="text-sm font-semibold hover:underline">
                  {vehicleCount.toLocaleString()}
                </span>
              </Anchor>
            )}
          </div>

          {!vehicleLoading && !hasVehicles && (
            <div className="flex flex-row items-center gap-1 text-xs text-text-secondary ml-auto">
              <WarningAmberIcon className="w-4 h-4" />
              No vehicles connected
            </div>
          )}
        </div>

        {/* Sharing link */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-text-secondary">
            Sharing Link
          </span>
          {sharingLinkLoading ? (
            <BubbleLoader isLoading isSmall />
          ) : sharingLink ? (
            <button
              onClick={() => navigator.clipboard.writeText(sharingLink)}
              className="flex items-center gap-1.5 w-fit text-xs text-primary hover:opacity-70 transition-opacity"
              title={sharingLink}
            >
              Vehicle Sharing Link
              <ContentCopyIcon className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Anchor href={`/license/${license.tokenId}/configurator`}>
              <span className="text-xs text-text-secondary hover:text-text-primary transition-colors">
                Not configured — set up vehicle sharing →
              </span>
            </Anchor>
          )}
        </div>

        {/* CTA */}
        <Anchor href={`/license/${license.tokenId}/details`}>
          <Button className={'dark w-full !h-10'}>License Details</Button>
        </Anchor>
      </div>
    </Card>
  );
};
