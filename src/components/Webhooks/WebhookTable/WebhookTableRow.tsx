import { Webhook } from '@/types/webhook';
import classNames from 'classnames';
import { WebhookTableCell } from '@/components/Webhooks/WebhookTable/WebhookTableCell';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/16/solid';
import React from 'react';

import '../Webhooks.css';

const dataProperties: (keyof Omit<Webhook, 'parameters'>)[] = [
  'description',
  'service',
  'setup',
  'status',
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
    {dataProperties.map((property, index) => (
      <WebhookTableCell
        key={property}
        isExpanded={isExpanded}
        isLast={isLast}
        className={index === dataProperties.length - 1 ? 'pr-4' : undefined}
      >
        {webhook[`${property}`]}
      </WebhookTableCell>
    ))}
  </tr>
);
