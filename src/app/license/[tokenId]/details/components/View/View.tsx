'use client';
import { useEffect, useState } from 'react';
import { PencilIcon } from '@heroicons/react/16/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gql, useFragment } from '@/gql';
import { useQuery } from '@apollo/client';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';
import { CopyableRow } from '@/components/CopyableRow';
import { WorkspaceNameModal } from '@/components/WorkspaceNameModal';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { Loader } from '@/components/Loader';
import { Signers } from '@/app/license/[tokenId]/details/components/Signers';
import { RedirectUris } from '@/app/license/[tokenId]/details/components/RedirectUris';
import {
  Vehicles,
  GET_VEHICLE_COUNT_BY_CLIENT_ID,
} from '@/app/license/[tokenId]/details/components/Vehicles/Vehicles';
import { DeveloperJwts } from '@/app/license/[tokenId]/details/components/DeveloperJwts';
import { Brand } from '@/app/license/[tokenId]/details/components/Brand';
import { Usage } from '@/app/license/[tokenId]/details/components/Usage/Usage';
import './View.css';

type Tab = 'overview' | 'config' | 'vehicles' | 'brand';

const IDENTITY_API_UPDATE_DELAY = 6000;

const GET_DEVELOPER_LICENSE = gql(`
  query GetDeveloperLicense($tokenId: Int!) {
    developerLicense(by: {tokenId: $tokenId}) {
      ...DeveloperLicenseSummaryFragment
      ...SignerFragment
      ...RedirectUriFragment
      ...DeveloperLicenseVehiclesFragment
      ...DeveloperJwtsFragment
      ...BrandFragment
    }
  }
`);

export const View = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const [tokenId, setTokenId] = useState<number>();
  const { data, loading, refetch, error } = useQuery(GET_DEVELOPER_LICENSE, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });

  const handleRefetch = async () =>
    new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        refetch({ tokenId })
          .then(() => resolve())
          .catch(reject);
      }, IDENTITY_API_UPDATE_DELAY);
    });

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    void getTokenId();
  }, [params]);

  if (loading) {
    return (
      <div className="license-details-page">
        <Loader isLoading={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="license-details-page">
        <p>There was an error fetching the license details</p>
      </div>
    );
  }

  if (!data?.developerLicense) return null;

  return (
    <LicenseDetailsContent license={data.developerLicense} refetch={handleRefetch} />
  );
};

interface LicenseDetailsContentProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  license: any;
  refetch: () => Promise<void>;
}

const LicenseDetailsContent = ({ license, refetch }: LicenseDetailsContentProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const router = useRouter();
  const licenseFragment = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, license);
  const isLicenseOwner = useIsLicenseOwner(licenseFragment);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'config', label: 'Config' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'brand', label: 'Brand' },
  ];

  return (
    <div className="license-details-page">
      {/* Persistent header */}
      <div className="license-header">
        <div className="license-header__top">
          <div className="license-header__identity">
            <span className="license-header__name">{licenseFragment.alias}</span>
            <span className="license-header__token-id">#{licenseFragment.tokenId}</span>
            {isLicenseOwner && (
              <button
                className="license-header__rename-btn"
                onClick={() => setIsRenameOpen(true)}
                title="Rename"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="license-header__client-id">
          <CopyableRow
            value={licenseFragment.clientId}
            onCopySuccessMessage="Client ID copied!"
          />
        </div>
        <nav className="license-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`license-tab${activeTab === tab.id ? ' license-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="license-tab-content">
        {activeTab === 'overview' && (
          <>
            <div className="overview-stats">
              <Usage license={license} />
              <div className="overview-stat-card">
                {licenseFragment.clientId ? (
                  <VehicleCountStat
                    clientId={licenseFragment.clientId}
                    onViewVehicles={() => setActiveTab('vehicles')}
                  />
                ) : null}
              </div>
            </div>
            <div className="overview-quick-actions">
              <p className="overview-quick-actions__label">Quick actions</p>
              <div className="overview-quick-actions__grid">
                <button
                  className="overview-quick-action"
                  onClick={() => setActiveTab('config')}
                >
                  🔑 Generate API Key
                </button>
                <button
                  className="overview-quick-action"
                  onClick={() => setActiveTab('config')}
                >
                  🪪 Generate JWT
                </button>
                <button
                  className="overview-quick-action"
                  onClick={() =>
                    router.push(`/license/${licenseFragment.tokenId}/configurator`)
                  }
                >
                  ⚙️ Setup Vehicle Sharing
                </button>
                <Link
                  href="https://docs.dimo.org"
                  target="_blank"
                  className="overview-quick-action"
                >
                  📖 Docs
                </Link>
              </div>
            </div>
          </>
        )}

        {activeTab === 'config' && (
          <>
            <Signers license={license} refetch={refetch} />
            <DeveloperJwts license={license} />
            <RedirectUris license={license} refetch={refetch} />
          </>
        )}

        {activeTab === 'vehicles' && <Vehicles license={license} />}

        {activeTab === 'brand' && <Brand license={license} />}
      </div>

      <WorkspaceNameModal
        isOpen={isRenameOpen}
        setIsOpen={setIsRenameOpen}
        license={licenseFragment}
        onSuccess={refetch}
      />
    </div>
  );
};

const VehicleCountStat = ({
  clientId,
  onViewVehicles,
}: {
  clientId: string;
  onViewVehicles: () => void;
}) => {
  const { data, loading } = useQuery(GET_VEHICLE_COUNT_BY_CLIENT_ID, {
    variables: { clientId },
  });

  if (loading) return <p className="overview-stat-card__number">…</p>;

  return (
    <>
      <button
        onClick={onViewVehicles}
        className="overview-stat-card__number hover:opacity-80 transition-opacity text-left"
      >
        {data?.vehicles.totalCount ?? '—'}
      </button>
      <p className="overview-stat-card__label">Vehicles Connected</p>
      <button onClick={onViewVehicles} className="overview-stat-card__link">
        View vehicles →
      </button>
    </>
  );
};

export default View;
