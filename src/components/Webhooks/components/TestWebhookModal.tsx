import { useTranslations } from 'next-intl';
import React, { useState } from 'react';
import axios from 'axios';
import { Webhook } from '@/types/webhook';
import Button from '@/components/Button/Button';
import Title from '@/components/Title/Title';
import { Modal } from '@/components/Modal';
import { WebhookDetailsCard } from '@/components/Webhooks/components/WebhookDetailsCard';
import { toast } from 'sonner';
import { BubbleLoader } from '@/components/BubbleLoader';
import { extractAxiosMessage } from '@/utils/api';
import { captureException } from '@sentry/nextjs';

interface TestWebhookModalProps {
  webhook: Webhook;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const TestWebhookModal: React.FC<TestWebhookModalProps> = ({
  isOpen,
  setIsOpen,
  webhook,
}) => {
  const t = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);

  const handleRunWebhookTest = async () => {
    try {
      const fakeData = { event: 'test_event', data: 'This is test data' };
      await axios.post(webhook.targetURL, fakeData, {
        headers: { 'Content-Type': 'application/json' },
      });
      toast.success(t('webhooks.test.triggered'));
    } catch (err: unknown) {
      captureException(err);
      const message = extractAxiosMessage(err, t('webhooks.test.axiosError'));
      toast.error(message);
    }
  };

  const onTest = async () => {
    try {
      setIsLoading(true);
      await handleRunWebhookTest();
    } catch (err: unknown) {
      let errorMessage = t('webhooks.test.error');
      if (err instanceof Error) {
        errorMessage = err.message ?? errorMessage;
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className="flex flex-col flex-1 w-full gap-12">
        <Title className={'text-panel-title'}>
          {isLoading ? t('webhooks.test.sending') : t('webhooks.test.title')}
        </Title>
        <TestWebhookBody isLoading={isLoading} webhook={webhook} />
        <TestWebhookFooter
          isLoading={isLoading}
          onTest={onTest}
          onCancel={() => setIsOpen(false)}
        />
      </div>
    </Modal>
  );
};

const TestWebhookBody: React.FC<{
  isLoading: boolean;
  webhook: Webhook;
}> = ({ isLoading, webhook }) => {
  const t = useTranslations('common');
  if (isLoading) {
    return (
      <div className="flex flex-1 justify-center items-center">
        <BubbleLoader isLoading />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p>{t('webhooks.test.confirm')}</p>
      <WebhookDetailsCard webhook={webhook} />
    </div>
  );
};

const TestWebhookFooter: React.FC<{
  isLoading: boolean;
  onTest: () => void;
  onCancel: () => void;
}> = ({ isLoading, onTest, onCancel }) => {
  const t = useTranslations('common');
  if (isLoading) return null;

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={onTest}>{t('webhooks.test.send')}</Button>
      <Button variant="secondary" onClick={onCancel}>
        {t('actions.close')}
      </Button>
    </div>
  );
};
