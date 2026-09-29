import React from 'react';

export const WebhookUrlDisplay = ({ url }: { url: string }) => {
  return (
    <div>
      <label className="block text-label text-muted mb-2">Webhook URL</label>
      <input
        type="text"
        value={url}
        readOnly
        className="w-full rounded-control bg-control px-3 py-2 font-mono text-code text-fg"
      />
    </div>
  );
};
