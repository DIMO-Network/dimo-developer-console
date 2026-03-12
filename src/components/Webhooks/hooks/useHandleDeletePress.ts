import { useWebhookTableContext } from '@/components/Webhooks/providers/WebhookTableContextProvider';

export const useHandleDeletePress = () => {
  const { setIsDeleteOpen } = useWebhookTableContext();
  return () => setIsDeleteOpen(true);
};
