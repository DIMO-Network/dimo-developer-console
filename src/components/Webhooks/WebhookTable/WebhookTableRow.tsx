import { Webhook } from '@/types/webhook';
import classNames from 'classnames';
import { WebhookTableCell } from '@/components/Webhooks/WebhookTable/WebhookTableCell';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/16/solid';
import React from 'react';
import { StatusBadge } from '@/components/Webhooks/components/StatusBadge';

import '../Webhooks.css';

type DataConfig<K extends keyof Webhook> = {
  key: K;
  render?: (value: Webhook[K], webhook: Webhook) => React.ReactNode;
};

const dataConfig: DataConfig<keyof Omit<Webhook, 'parameters'>>[] = [
  { key: 'description' },
  { key: 'service' },
  { key: 'setup' },
  {
    key: 'status',
    render: (value) => <StatusBadge status={value} />,
  },
];

export const WebhookTableRow = ({
  webhook,
  onClick,
  isExpanded,
  isLast,
}: {
  webhook: Webhook;
  onClick: () => void;
  isExpanded: boolean;
  isLast: boolean;
}) => (
  <tr onClick={onClick} className={classNames(isExpanded ? 'bg-surface-sunken' : '')}>
    <WebhookTableCell
      isLast={isLast}
      isExpanded={isExpanded}
      className={classNames('pl-4 pr-2 align-middle w-4')}
    >
      {isExpanded ? (
        <ChevronUpIcon className="h-4 w-4 text-text-secondary" />
      ) : (
        <ChevronDownIcon className="h-4 w-4 text-text-secondary" />
      )}
    </WebhookTableCell>
    {dataConfig.map(({ key, render }, index) => (
      <WebhookTableCell
        key={key}
        isExpanded={isExpanded}
        isLast={isLast}
        className={index === dataConfig.length - 1 ? 'pr-4' : undefined}
      >
        {render ? render(webhook[key], webhook) : webhook[key]}
      </WebhookTableCell>
    ))}
  </tr>
);
