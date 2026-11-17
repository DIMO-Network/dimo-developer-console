import { useTranslations } from 'next-intl';
import { type FC, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { Button } from '@/components/Button';
import { inquiryOptions, IDevSupportForm } from '@/types/support';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { TextArea } from '@/components/TextArea';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';

import './DevSupportForm.css';

interface IProps {
  onSubmit: (data: IDevSupportForm) => Promise<void>;
  onCancel: () => void;
}

export const DevSupportForm: FC<IProps> = ({ onSubmit, onCancel }) => {
  const t = useTranslations('common');
  const [isLoading, setIsLoading] = useState(false);
  const memoizedInquiryOptions = useMemo(() => inquiryOptions, []);
  const { currentUser } = useGlobalAccount();

  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
    getValues,
    reset,
  } = useForm<IDevSupportForm>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {},
  });

  const handleFormSubmit = async () => {
    setIsLoading(true);
    const formData = getValues();
    await onSubmit(formData);
    reset();
    setIsLoading(false);
  };

  const handleCancel = () => {
    reset();
    onCancel();
  };

  return (
    <form className="form-dev-support w-full" onSubmit={handleSubmit(handleFormSubmit)}>
      <div className="fields">
        <div className="field">
          <Label htmlFor="userName">
            {t('devSupportForm.userName')}
            <TextField
              type="text"
              value={currentUser?.email}
              readOnly
              role="user-name-input"
            />
          </Label>
        </div>
        <div className="field">
          <Label htmlFor="inquiryType">
            {t('devSupportForm.inquiryType')}
            <SelectField
              name="inquiryType"
              rules={{ required: t('validation.required') }}
              options={memoizedInquiryOptions}
              control={control}
              placeholder={t('devSupportForm.inquiryPlaceholder')}
              role="inquiry-type-select"
            />
            {errors.inquiryType && (
              <TextError errorMessage={errors.inquiryType.message ?? ''} />
            )}
          </Label>
        </div>
        <div className="field">
          <Label htmlFor="message">
            {t('devSupportForm.message')}
            <TextArea
              placeholder={t('devSupportForm.messagePlaceholder')}
              rows={5}
              {...register('message', {
                required: t('validation.required'),
                maxLength: {
                  value: 500,
                  message: t('devSupportForm.messageTooLong'),
                },
              })}
              role="message-input"
              className="textarea-class w-full"
            />
            {errors.message && <TextError errorMessage={errors.message.message ?? ''} />}
          </Label>
        </div>
      </div>
      <div className="actions">
        <Button className="w-full" loading={isLoading}>
          {t('devSupportForm.submit')}
        </Button>
        <Button variant="secondary" className="w-full" onClick={handleCancel}>
          {t('actions.cancel')}
        </Button>
      </div>
    </form>
  );
};

export default DevSupportForm;
