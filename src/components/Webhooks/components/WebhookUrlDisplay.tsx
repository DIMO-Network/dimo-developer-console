import { useTranslations } from 'next-intl';
import React from 'react';

export const WebhookUrlDisplay = ({ url }: { url: string }) => {
  const t = useTranslations('common');
  return (
    <div>
      <label className="block text-label text-muted mb-2">
        {t('webhooks.url.label')}
      </label>
      <input
        type="text"
        value={url}
        readOnly
        className="w-full rounded-control bg-control px-3 py-2 text-body-sm text-fg"
      />
    </div>
  );
};
