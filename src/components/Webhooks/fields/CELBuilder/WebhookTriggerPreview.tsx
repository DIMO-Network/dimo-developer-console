import { WebhookFormInput } from '@/types/webhook';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { NotificationContext } from '@/context/notificationContext';
import { formatAndGenerateCEL, validateCel } from '@/utils/webhook';
import { captureException } from '@sentry/nextjs';
import { Button } from '@/components/Button';

export const WebhookTriggerPreview = ({ cel }: { cel: WebhookFormInput['cel'] }) => {
  const [generatedCEL, setGeneratedCEL] = useState<string>();
  const { setNotification } = useContext(NotificationContext);

  const generateCelExpression = useCallback(() => {
    const response = formatAndGenerateCEL(cel);
    setGeneratedCEL(JSON.stringify(response, null, 2));
  }, [cel]);

  const handleGenerate = () => {
    try {
      generateCelExpression();
    } catch (err) {
      captureException(err);
      setNotification((err as Error).message, '', 'error');
    }
  };

  useEffect(() => {
    if (cel && !generatedCEL && !validateCel(cel)) {
      generateCelExpression();
    }
  }, [cel, generateCelExpression, generatedCEL]);

  return (
    <>
      <div className="flex flex-row gap-2">
        <Button
          type="button"
          onClick={handleGenerate}
          variant="secondary"
          className="self-start"
        >
          Generate CEL
        </Button>
      </div>
      {!!generatedCEL && (
        <div className={'bg-sheet py-2 px-3 rounded-control'}>
          <p className={'break-all font-mono text-code text-fg'}>{generatedCEL}</p>
        </div>
      )}
    </>
  );
};
