import React, { createContext, useContext } from 'react';
import { Webhook } from '@/types/webhook';
import { useWebhooks } from '@/hooks/queries/useWebhooks';

interface WebhookTableContextProps {
  toggleExpandedWebhookId: (webhookId: string) => void;
  isDeleteOpen: boolean;
  setIsDeleteOpen: (isDeleteOpen: boolean) => void;
  expandedWebhook: Webhook | undefined;
  resetExpandedWebhookId: () => void;
}

export const WebhookTableContext = createContext<WebhookTableContextProps | undefined>(
  undefined,
);
export const WebhookTableContextProvider: React.FC<
  React.PropsWithChildren<{ clientId: string }>
> = ({ children, clientId }) => {
  const { data } = useWebhooks(clientId);
  const [expandedWebhookId, setExpandedWebhookId] = React.useState<string>();
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  const toggleExpandedWebhookId = (webhookId: string) => {
    setExpandedWebhookId((cur) => (cur === webhookId ? undefined : webhookId));
  };

  const resetExpandedWebhookId = () => setExpandedWebhookId(undefined);

  const expandedWebhook = expandedWebhookId
    ? (data ?? []).find((webhook) => webhook.id === expandedWebhookId)
    : undefined;

  return (
    <WebhookTableContext.Provider
      value={{
        toggleExpandedWebhookId,
        isDeleteOpen,
        setIsDeleteOpen,
        expandedWebhook,
        resetExpandedWebhookId,
      }}
    >
      {children}
    </WebhookTableContext.Provider>
  );
};
export const useWebhookTableContext = () => {
  const context = useContext(WebhookTableContext);
  if (!context) {
    throw new Error('useWebhookTableContext must be used within a WebhookTableContext');
  }
  return context;
};
