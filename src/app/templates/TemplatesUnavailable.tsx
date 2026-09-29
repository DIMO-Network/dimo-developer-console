import React, { type FC } from 'react';

export const TemplatesUnavailable: FC = () => (
  <div className="flex w-full flex-col items-center justify-center gap-1.5 rounded-card bg-card p-10 text-center">
    <p className="text-card-title text-ink">Vehicle templates are coming soon</p>
    <p className="text-body-sm text-muted">
      The template editor isn&apos;t available yet. Check back soon.
    </p>
  </div>
);
