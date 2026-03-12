export interface SubscribeVehiclesActionModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  webhookId: string;
  clientId: string;
  onSuccess?: () => void;
}
