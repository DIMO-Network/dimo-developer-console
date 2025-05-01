import { FC, useCallback, useContext, useMemo, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { Button } from '@/components/Button';
import { NotificationContext } from '@/context/notificationContext';
import { BubbleLoader } from '@/components/BubbleLoader';
import { CopyableRow } from '@/components/CopyableRow';
import { saveDevJwt } from '@/utils/devJwt';
import { getDeveloperJwt } from '@/services/dimoDev';

interface IProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  tokenParams: { client_id: string; domain: string };
  onSuccess?: (newDevJwt: string) => void;
}

export const GenerateDevJWTModal: FC<IProps> = ({
  isOpen,
  setIsOpen,
  tokenParams,
  onSuccess,
}) => {
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState('');
  const { setNotification } = useContext(NotificationContext);

  const handleGenerate = useCallback(async () => {
    if (!text) {
      return setNotification('Please enter a valid API key', '', 'error');
    }
    try {
      setIsLoading(true);
      const devJwt = await getDeveloperJwt({
        client_id: tokenParams.client_id,
        domain: tokenParams.domain,
        private_key: text,
      });
      const authHeader = devJwt.headers.Authorization;
      const token = authHeader?.split(' ')[1] ?? '';
      console.log('This was the token generated from the function: ', token);
      setGeneratedKey(token);
      saveDevJwt(tokenParams.client_id, token);
      onSuccess?.(token);
    } catch (err) {
      console.error('Failed to generate developer JWT', err);
      setNotification('Failed to generate developer JWT', '', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, setNotification, text, tokenParams.client_id, tokenParams.domain]);

  const title = useMemo(() => {
    if (generatedKey) return 'JWT generated';
    return 'Get JWT';
  }, [generatedKey]);

  const subtitle = useMemo(() => {
    if (generatedKey) return '';
    return 'This will generate a Developer JWT using the first available Redirect URI below and your Client ID. Enter one of your saved API Keys to get started.';
  }, [generatedKey]);

  const MainComponent = useMemo(() => {
    if (isLoading) {
      return (
        <div className={'flex flex-col items-center'}>
          <BubbleLoader isLoading />
          <p className={'pt-3.5 text-xl'}>Generating JWT...</p>
        </div>
      );
    }
    if (generatedKey) {
      return <SuccessRow token={generatedKey} />;
    }
    return (
      <>
        <Label className={'text-sm font-medium mb-2'}>API key</Label>
        <TextField
          onChange={(e) => setText(e.target.value)}
          placeholder={'Enter your API key here'}
        />
      </>
    );
  }, [generatedKey, isLoading]);

  const Buttons = useMemo(() => {
    if (generatedKey) {
      return (
        <Button className={'primary-outline'} onClick={() => setIsOpen(false)}>
          Done
        </Button>
      );
    }
    return (
      <>
        <Button loading={isLoading} onClick={handleGenerate}>
          Generate
        </Button>
        <Button className={'primary-outline'}>Cancel</Button>
      </>
    );
  }, [generatedKey, handleGenerate, isLoading, setIsOpen]);

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen}>
      <div className={'flex flex-col flex-1 w-full'}>
        <div className={'pb-6'}>
          <Title component={'h2'} className={'text-2xl !leading-8'}>
            {title}
          </Title>
          <p className={'text-text-secondary mt-2'}>{subtitle}</p>
        </div>
        <div className={'py-6'}>{MainComponent}</div>
        <div className={'pt-6 flex flex-1 flex-col w-full gap-4'}>{Buttons}</div>
      </div>
    </Modal>
  );
};

const SuccessRow = ({ token }: { token: string }) => {
  const visiblePart = token.slice(0, 16);
  const maskedPart = '*'.repeat(32);
  const displayText = `${visiblePart}${maskedPart}`;
  return (
    <div
      className={
        'bg-feedback-success bg-opacity-50 py-3 px-4 rounded-xl flex flex-col gap-2'
      }
    >
      <p className={'text-sm'}>Expires in 14 days.</p>
      <CopyableRow
        value={token}
        displayText={displayText}
        onCopySuccessMessage={'JWT copied!'}
      />
    </div>
  );
};
