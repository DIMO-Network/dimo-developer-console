import { type FC } from 'react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';
import { Title } from '@/components/Title';

import './SignerForm.css';

interface ISigner {
  address: string;
}

export const SignerForm: FC = () => {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<ISigner>({
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const addSigner = () => {};

  return (
    <div className="signer-form">
      <Title component="h3" className="text-base">
        Add new signer
      </Title>
      <form onSubmit={handleSubmit(addSigner)}>
        <div className="field">
          <Label htmlFor="address">
            <TextField
              {...register('address', {
                required: 'Please enter the signer address',
              })}
              placeholder="0x address"
              className="address"
              role="signer-address-input"
            />
          </Label>
          {errors.address && <TextError errorMessage={errors.address?.message ?? ''} />}
        </div>
        <div className="cta">
          <Button className="primary-outline px-4">Generate Key</Button>
        </div>
      </form>
    </div>
  );
};

export default SignerForm;
