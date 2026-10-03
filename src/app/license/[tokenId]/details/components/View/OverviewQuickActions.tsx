'use client';
import type { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OwnerAction } from '@/components/OwnerOnly';

export const OverviewQuickActions: FC<{
  tokenId: number;
  onSelectTab: (tab: 'config' | 'brand') => void;
}> = ({ tokenId, onSelectTab }) => {
  const router = useRouter();
  return (
    <div className="overview-quick-actions">
      <p className="overview-quick-actions__label">Quick actions</p>
      <div className="overview-quick-actions__grid">
        <OwnerAction>
          <button className="overview-quick-action" onClick={() => onSelectTab('config')}>
            🔑 Generate API key
          </button>
          <button className="overview-quick-action" onClick={() => onSelectTab('brand')}>
            🪪 Configure branding
          </button>
          <button
            className="overview-quick-action"
            onClick={() => router.push(`/license/${tokenId}/configurator`)}
          >
            ⚙️ Setup vehicle sharing
          </button>
        </OwnerAction>
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
