import { useEffect, useState } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { Card } from '@/components/Card';
import classNames from 'classnames';
import { Anchor } from '@/components/Anchor';
import { useQuery } from '@apollo/client';
import { BubbleLoader } from '@/components/BubbleLoader';
import { ContentCopyIcon, WarningAmberIcon } from '@/components/Icons';
import { GET_VEHICLE_COUNT_BY_CLIENT_ID } from '@/app/license/[tokenId]/details/components/Vehicles';
import { getConfigurationsByClientId } from '@/actions/configurations';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
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
    <Card
      className={classNames('license-card cursor-pointer', props.className)}
      onClick={() => router.push(`/license/${license.tokenId}/details`)}
    >
      <div className="content">
        {/* Header */}
        <div className="flex w-full flex-row justify-between items-start">
          <p className="title">{license.alias}</p>
          <span className="text-[10px] font-mono text-text-secondary">
            #{license.tokenId}
          </span>
        </div>

        {/* Stats */}
        <div className="flex flex-row items-center gap-4 py-2 border-y border-border">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-text-secondary">
              Vehicles Connected
            </span>
            {vehicleLoading ? (
              <BubbleLoader isLoading isSmall />
            ) : (
              <Anchor
                href={`/license/vehicles/${license.clientId}`}
                onClick={(e) => e.stopPropagation()}
              >
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
        {sharingLinkLoading ? (
          <BubbleLoader isLoading isSmall />
        ) : configCount !== null && configCount > 1 ? (
          <Anchor
            href={`/license/${license.tokenId}/configurator`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-primary hover:opacity-70 transition-opacity">
              {configCount} configurations →
            </span>
          </Anchor>
        ) : sharingLink ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigator.clipboard.writeText(sharingLink);
              toast.success('Sharing link copied');
            }}
            className="flex items-center gap-2 w-fit text-xs text-primary hover:opacity-70 transition-opacity"
            title={sharingLink}
          >
            <ContentCopyIcon className="w-4 h-4 shrink-0" />
            Vehicle Sharing Link
          </button>
        ) : (
          <Anchor
            href={`/license/${license.tokenId}/configurator`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-xs text-text-secondary hover:text-foreground transition-colors">
              Not configured — set up vehicle sharing →
            </span>
          </Anchor>
        )}
      </div>
    </Card>
  );
};
