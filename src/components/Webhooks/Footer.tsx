import React from 'react';
import Button from '@/components/Button/Button';

type FooterProps = {
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
  shouldSubmit: boolean;
  isValid: boolean;
  isSubmitting: boolean;
};

const Footer: React.FC<FooterProps> = ({
  onPrevious,
  onNext,
  onSubmit,
  isFirstStep,
  isLastStep,
  shouldSubmit,
  isValid,
  isSubmitting,
}) => {
  const prevButtonText = isFirstStep ? 'Cancel' : 'Previous';
  const nextButtonText = isLastStep ? 'Finish' : 'Next';

  return (
    <div className={'flex flex-col-reverse md:flex-row pt-6 flex-1 gap-4'}>
      <Button className={'flex-1 primary-outline'} onClick={onPrevious} type={'button'}>
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
