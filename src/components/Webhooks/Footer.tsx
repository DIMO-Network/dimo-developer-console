import React from 'react';
import Button from '@/components/Button/Button';

type FooterProps = {
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  shouldSubmit: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  prevButtonText: string;
  nextButtonText: string;
  previousDisabled: boolean;
};

const Footer: React.FC<FooterProps> = ({
  onPrevious,
  onNext,
  onSubmit,
  shouldSubmit,
  isValid,
  isSubmitting,
  prevButtonText,
  nextButtonText,
  previousDisabled,
}) => {
  return (
    <div className={'flex flex-col-reverse md:flex-row pt-6 flex-1 gap-4'}>
      <Button
        className={'flex-1 primary-outline'}
        onClick={onPrevious}
        type={'button'}
        disabled={previousDisabled}
      >
        {prevButtonText}
      </Button>
      <Button
        className={'flex-1'}
        type={'button'}
        onClick={shouldSubmit ? onSubmit : onNext}
        disabled={!isValid}
        loading={isSubmitting}
      >
        {nextButtonText}
      </Button>
    </div>
  );
};

export default Footer;
