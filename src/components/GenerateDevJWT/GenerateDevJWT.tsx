import { FC, useState } from 'react';
import Button from '@/components/Button/Button';
import { GenerateDevJWTModal } from '@/components/GenerateDevJWTModal';

interface GenerateDevJWTProps {
  clientId: string;
  domain?: string | null;
  onSuccess?: () => void;
  buttonText?: string;
  buttonClassName?: string;
}

export const GenerateDevJWT: FC<GenerateDevJWTProps> = ({
  clientId,
  domain,
  onSuccess,
  buttonText = 'Generate developer JWT',
  buttonClassName,
}) => {
  const [showGenerateJwtModal, setShowGenerateJwtModal] = useState(false);
  const isDisabled = !clientId || !domain;

  return (
    <>
      <Button
        className={buttonClassName}
        onClick={() => setShowGenerateJwtModal(true)}
        disabled={isDisabled}
      >
        {buttonText}
      </Button>
      <GenerateDevJWTModal
        isOpen={showGenerateJwtModal}
        setIsOpen={setShowGenerateJwtModal}
        tokenParams={{ client_id: clientId, domain: domain ?? '' }}
        onSuccess={onSuccess}
      />
    </>
  );
};
