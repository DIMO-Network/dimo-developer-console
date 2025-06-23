import React from 'react';

export const WebhookUrlDisplay = ({ url }: { url: string }) => {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-text-secondary">
        Webhook URL
      </label>
      <input
        type="text"
        value={url}
        readOnly
        className="w-full rounded-md bg-cta-default px-3 py-2 text-sm text-text-secondary"
      />
    </div>
  );
};
