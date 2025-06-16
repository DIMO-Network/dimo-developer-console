import { FC, useState } from 'react';
import Button from '@/components/Button/Button';
import { GenerateDevJWTModal } from '@/components/GenerateDevJWTModal';

interface GenerateDevJWTProps {
  clientId: string;
  domain: string;
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

  return (
    <>
      <Button className={buttonClassName} onClick={() => setShowGenerateJwtModal(true)}>
        {buttonText}
      </Button>
      <GenerateDevJWTModal
        isOpen={showGenerateJwtModal}
        setIsOpen={setShowGenerateJwtModal}
        tokenParams={{ client_id: clientId, domain: domain }}
        onSuccess={onSuccess}
      />
    </>
  );
};
