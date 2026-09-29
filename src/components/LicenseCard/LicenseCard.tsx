import { useContext, useEffect, useState } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { Card } from '@/components/Card';
import classNames from 'classnames';
import { Anchor } from '@/components/Anchor';
import { Button } from '@/components/Button';
import { useQuery } from '@apollo/client';
import { BubbleLoader } from '@/components/BubbleLoader';
import { ContentCopyIcon, WarningAmberIcon } from '@/components/Icons';
import { GET_VEHICLE_COUNT_BY_CLIENT_ID } from '@/app/license/[tokenId]/details/components/Vehicles';
import { getConfigurationsByClientId } from '@/actions/configurations';
import { NotificationContext } from '@/context/notificationContext';

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
  const { setNotification } = useContext(NotificationContext);

  const { data: vehicleData, loading: vehicleLoading } = useQuery(
    GET_VEHICLE_COUNT_BY_CLIENT_ID,
    {
      variables: { clientId: license.clientId },
    },
  );

  const [configCount, setConfigCount] = useState<number | null>(null);
  const [sharingLink, setSharingLink] = useState<string | null>(null);
  const [sharingLinkLoading, setSharingLinkLoading] = useState(true);

  useEffect(() => {
    if (!license.clientId) return;
    getConfigurationsByClientId({ client_id: license.clientId }).then((configs) => {
      setConfigCount(configs.length);
      const id = configs[0]?.id;
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
        <div className="flex w-full flex-row items-start justify-between gap-3">
          <p className="title min-w-0 break-words">{license.alias}</p>
          <span className="license-card-token-id">#{license.tokenId}</span>
        </div>

        {/* Stats */}
        <div className="flex flex-row flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div className="flex flex-col gap-1">
            <span className="text-label text-muted">Vehicles connected</span>
            {vehicleLoading ? (
              <BubbleLoader isLoading isSmall />
            ) : (
              <Anchor
                href={`/license/vehicles/${license.clientId}`}
                className="license-card-metric"
              >
                {vehicleCount.toLocaleString()}
              </Anchor>
            )}
          </div>

          {!vehicleLoading && !hasVehicles && (
            <div className="flex flex-row items-center gap-1.5 pb-1 text-label text-muted">
              <WarningAmberIcon className="h-4 w-4 text-warning" />
              No vehicles connected
            </div>
          )}
        </div>

        {/* Sharing link */}
        {sharingLinkLoading ? (
          <BubbleLoader isLoading isSmall />
        ) : configCount !== null && configCount > 1 ? (
          <Anchor
            href={`/license/${license.tokenId}/configurator`}
            className="license-card-link"
          >
            {configCount} configurations →
          </Anchor>
        ) : sharingLink ? (
          <button
            onClick={() => {
              navigator.clipboard.writeText(sharingLink);
              setNotification('Sharing link copied', '', 'success');
            }}
            className="license-card-link"
            title={sharingLink}
          >
            <ContentCopyIcon className="h-4 w-4 shrink-0" />
            Vehicle sharing link
          </button>
        ) : (
          <Anchor
            href={`/license/${license.tokenId}/configurator`}
            className="license-card-link"
          >
            Not configured — set up vehicle sharing →
          </Anchor>
        )}

        {/* CTA */}
        <Anchor href={`/license/${license.tokenId}/details`} className="!py-0">
          <Button variant="secondary" className={'w-full !h-10'}>
            License details
          </Button>
        </Anchor>
      </div>
    </Card>
  );
};
