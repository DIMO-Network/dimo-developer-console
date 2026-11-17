'use client';
import type { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export const OverviewQuickActions: FC<{
  tokenId: number;
  canManage: boolean;
  onSelectTab: (tab: 'config' | 'brand') => void;
}> = ({ tokenId, canManage, onSelectTab }) => {
  const router = useRouter();
  const t = useTranslations('license');
  return (
    <div className="overview-quick-actions">
      <p className="overview-quick-actions__label">{t('quickActions.label')}</p>
      <div className="overview-quick-actions__grid">
        {canManage && (
          <>
            <button
              className="overview-quick-action"
              onClick={() => onSelectTab('config')}
            >
              {t('quickActions.generateApiKey')}
            </button>
            <button
              className="overview-quick-action"
              onClick={() => onSelectTab('brand')}
            >
              {t('quickActions.configureBranding')}
            </button>
            <button
              className="overview-quick-action"
              onClick={() => router.push(`/license/${tokenId}/configurator`)}
            >
              {t('quickActions.setupSharing')}
            </button>
          </>
        )}
        <Link
          href="https://docs.dimo.org"
          target="_blank"
          className="overview-quick-action"
        >
          {t('quickActions.docs')}
        </Link>
      </div>
    </div>
  );
};
