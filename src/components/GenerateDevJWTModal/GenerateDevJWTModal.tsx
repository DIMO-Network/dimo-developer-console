import { useTranslations } from 'next-intl';
import { FC, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { Button } from '@/components/Button';
import { toast } from 'sonner';
import { BubbleLoader } from '@/components/BubbleLoader';
import { CopyableRow } from '@/components/CopyableRow';
import { saveDevJwt } from '@/utils/devJwt';
import { getDeveloperJwt } from '@/services/developerJwt';
import { captureException } from '@sentry/nextjs';

interface IProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  tokenParams: { client_id: string; domain: string };
  onSuccess?: () => void;
}

export const GenerateDevJWTModal: FC<IProps> = ({
  isOpen,
  setIsOpen,
  tokenParams,
  onSuccess,
}) => {
  const t = useTranslations('common');
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');

  // Ref updated synchronously so backdrop clicks are blocked immediately on generate,
  // without waiting for a React re-render cycle.
  const lockedRef = useRef(false);

  const safeSetIsOpen = useCallback(
    (value: boolean) => {
      if (!lockedRef.current) setIsOpen(value);
    },
    [setIsOpen],
  );

  useEffect(() => {
    if (!isOpen) {
      setText('');
      setGeneratedKey('');
      setIsLoading(false);
      lockedRef.current = false;
    }
  }, [isOpen]);

  const handleGenerate = useCallback(async () => {
    if (!text) {
      return toast.error(t('generateJwt.apiKeyRequired'));
    }
    // Lock synchronously before the async work and before React re-renders.
    lockedRef.current = true;
    try {
      setIsLoading(true);
      const devJwt = await getDeveloperJwt({
        client_id: tokenParams.client_id,
        domain: tokenParams.domain,
        private_key: text,
      });
      if (!devJwt) throw new Error('Failed to get developer JWT');
      const authHeader = devJwt.headers.Authorization;
      const token = authHeader?.split(' ')[1] ?? '';
      setGeneratedKey(token);
      saveDevJwt(tokenParams.client_id, token);
      onSuccess?.();
    } catch (err) {
      captureException(err);
      toast.error(t('generateJwt.failed'));
      // Unlock on failure so the user can cancel or try again.
      lockedRef.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, t, text, tokenParams.client_id, tokenParams.domain]);

  const title = useMemo(() => {
    if (generatedKey) return t('generateJwt.titleDone');
    return t('generateJwt.titleNew');
  }, [generatedKey, t]);

  const subtitle = useMemo(() => {
    if (generatedKey) return '';
    return t('generateJwt.subtitle');
  }, [generatedKey, t]);

  const MainComponent = useMemo(() => {
    if (isLoading) {
      return (
        <div className={'flex flex-col items-center'}>
          <BubbleLoader isLoading />
          <p className={'pt-3.5 text-card-title text-ink'}>
            {t('generateJwt.generating')}
          </p>
        </div>
      );
    }
    if (generatedKey) {
      return <SuccessRow token={generatedKey} />;
    }
    return (
      <>
        <Label className={'mb-2'}>{t('generateJwt.apiKeyLabel')}</Label>
        <TextField
          onChange={(e) => setText(e.target.value)}
          placeholder={t('generateJwt.apiKeyPlaceholder')}
        />
      </>
    );
  }, [generatedKey, isLoading, t]);

  const Buttons = useMemo(() => {
    if (generatedKey) {
      return (
        <Button variant="secondary" onClick={() => setIsOpen(false)}>
          {t('generateJwt.done')}
        </Button>
      );
    }
    return (
      <>
        <Button loading={isLoading} onClick={handleGenerate}>
          {t('generateJwt.generate')}
        </Button>
        <Button variant="secondary" onClick={() => setIsOpen(false)} disabled={isLoading}>
          {t('actions.cancel')}
        </Button>
      </>
    );
  }, [generatedKey, handleGenerate, isLoading, setIsOpen, t]);

  const isDismissible = !isLoading && !generatedKey;

  return (
    <Modal isOpen={isOpen} setIsOpen={safeSetIsOpen} showClose={isDismissible}>
      <div className={'flex flex-col flex-1 w-full'}>
        <div className={'pb-6'}>
          <Title component={'h2'} className={'text-panel-title'}>
            {title}
          </Title>
          <p className={'mt-2 text-body-sm text-muted'}>{subtitle}</p>
        </div>
        <div className={'py-6'}>{MainComponent}</div>
        <div className={'pt-6 flex flex-1 flex-col w-full gap-4'}>{Buttons}</div>
      </div>
    </Modal>
  );
};

const SuccessRow = ({ token }: { token: string }) => {
  const t = useTranslations('common');
  const visiblePart = token.slice(0, 16);
  const maskedPart = '*'.repeat(32);
  const displayText = `${visiblePart}${maskedPart}`;
  return (
    <div className={'flex flex-col gap-2 rounded-control bg-positive/10 px-4 py-3'}>
      <p className={'text-body-sm text-fg'}>{t('generateJwt.expires')}</p>
      <CopyableRow
        value={token}
        displayText={displayText}
        onCopySuccessMessage={t('generateJwt.copied')}
      />
    </div>
  );
};
