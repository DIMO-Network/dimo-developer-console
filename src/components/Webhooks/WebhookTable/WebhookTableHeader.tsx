import React from 'react';
import Column from '@/components/Table/Column';

import '../Webhooks.css';
export const WebhookTableHeader: React.FC<React.PropsWithChildren> = ({ children }) => (
  <Column className="cell-bottom-border">{children}</Column>
);
