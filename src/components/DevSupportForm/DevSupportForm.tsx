import { type FC, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';

import { useGlobalAccount } from '@/hooks';
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
      <div className="field">
        <Label htmlFor="userName" className="text-xs text-medium">
          User Name
          <TextField
            type="text"
            value={currentUser?.email}
            readOnly
            role="user-name-input"
          />
        </Label>
      </div>
      <div className="field">
        <Label htmlFor="inquiryType" className="text-xs text-medium">
          Inquiry Type
          <SelectField
            {...register('inquiryType', {
              required: 'This field is required',
            })}
            options={memoizedInquiryOptions}
            control={control}
            placeholder="Select inquiry"
            role="inquiry-type-select"
          />
          {errors.inquiryType && (
            <TextError errorMessage={errors.inquiryType.message ?? ''} />
          )}
        </Label>
      </div>
      <div className="field">
        <Label htmlFor="message" className="text-xs text-medium">
          Message
          <TextArea
            placeholder="Let us know how we can help..."
            rows={5}
            {...register('message', {
              required: 'This field is required',
              maxLength: {
                value: 500,
                message: 'The message should have a maximum of 500 characters',
              },
            })}
            role="message-input"
            className="textarea-class w-full"
          />
          {errors.message && <TextError errorMessage={errors.message.message ?? ''} />}
        </Label>
      </div>
      <div className="cta flex flex-col space-y-2">
        <Button className="primary w-full" loading={isLoading} loadingColor="primary">
          Submit
        </Button>
        <Button className="dark w-full" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default DevSupportForm;
