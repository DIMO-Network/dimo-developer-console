import React from 'react';
import Cell from '@/components/Table/Cell';
import classNames from 'classnames';

import '../Webhooks.css';

export const WebhookTableCell: React.FC<
  React.PropsWithChildren<{ className?: string; isExpanded: boolean; isLast: boolean }>
> = ({ children, className, isExpanded, isLast }) => (
  <Cell className={classNames(!isExpanded && !isLast && 'cell-bottom-border', className)}>
    {children}
  </Cell>
);
