import 'server-only';
import type { ReactNode } from 'react';
import { useMessages } from 'next-intl';
import { pickMessages } from './messages';
import { MergeMessages } from './MergeMessages';

// Reads the request's messages and sends the browser just these areas.
export const AreaMessages = ({
  areas,
  children,
}: {
  areas: readonly string[];
  children: ReactNode;
}) => {
  const messages = useMessages();
  return (
    <MergeMessages messages={pickMessages(messages, areas)}>{children}</MergeMessages>
  );
};
