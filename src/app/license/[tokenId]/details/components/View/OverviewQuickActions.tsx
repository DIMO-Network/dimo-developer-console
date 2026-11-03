'use client';
import type { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export const OverviewQuickActions: FC<{
  tokenId: number;
  canManage: boolean;
  onSelectTab: (tab: 'config' | 'brand') => void;
}> = ({ tokenId, canManage, onSelectTab }) => {
  const router = useRouter();
  return (
    <div className="overview-quick-actions">
      <p className="overview-quick-actions__label">Quick actions</p>
      <div className="overview-quick-actions__grid">
        {canManage && (
          <>
            <button
              className="overview-quick-action"
              onClick={() => onSelectTab('config')}
            >
              🔑 Generate API key
            </button>
            <button
              className="overview-quick-action"
              onClick={() => onSelectTab('brand')}
            >
              🪪 Configure branding
            </button>
            <button
              className="overview-quick-action"
              onClick={() => router.push(`/license/${tokenId}/configurator`)}
            >
              ⚙️ Setup vehicle sharing
            </button>
          </>
        )}
        <Link
          href="https://docs.dimo.org"
          target="_blank"
          className="overview-quick-action"
        >
          📖 Docs
        </Link>
      </div>
    </div>
  );
};
