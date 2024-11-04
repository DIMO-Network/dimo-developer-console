import { isEmail } from 'validator';
import { useForm } from 'react-hook-form';
import { FC } from 'react';

import config from '@/config';

import { Button } from '@/components/Button';
import { IInvitation } from '@/types/team';
import { Label } from '@/components/Label';
import { PlusIcon } from '@/components/Icons';
import { SelectField } from '@/components/SelectField';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';

import './TeamForm.css';

const roleOptions = config.ROLES.map((roleName) => ({
  value: roleName,
  text: roleName,
})) as { value: string; text: string }[];

interface IProps {
  isLoading: boolean;
  inviteToTeam: (a: IInvitation) => Promise<void>;
}

export const TeamForm: FC<IProps> = ({ isLoading, inviteToTeam }) => {
  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
    getValues,
    reset,
  } = useForm<IInvitation>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      role: config.ROLES[0],
    },
  });

  const onSubmit = async () => {
    const invitation = getValues();
    await inviteToTeam(invitation);
    reset();
  };

  return (
    <form className="form-team-invitation" onSubmit={handleSubmit(onSubmit)}>
      <div className="field">
        <Label htmlFor="email" className="text-xs text-medium">
          Email
          <TextField
            type="text"
            placeholder="Enter email"
            {...register('email', {
              required: 'This field is required',
              maxLength: {
                value: 120,
                message: 'The name should has maximum 120 characters',
              },
              validate: {
                isEmail: (str: string) => str && isEmail(str),
              },
            })}
            role="namespace-input"
          />
          {errors?.email && (
            <TextError errorMessage="This field must be a valid email" />
          )}
        </Label>
      </div>
      <div className="field">
        <Label htmlFor="role" className="text-xs text-medium">
          Role
          <SelectField
            {...register('role', {
              required: 'This field is required',
            })}
            options={roleOptions}
            control={control}
            placeholder="Select a role"
            value={config.ROLES[0]}
            role="company-region"
          />
          {errors.role && (
            <TextError errorMessage={errors.role.message ?? ''} />
          )}
        </Label>
      </div>
      <div className="cta">
        <Button
          className="primary px-4 w-full"
          loading={isLoading}
          loadingColor="primary"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Send email invitation
        </Button>
      </div>
    </form>
  );
};

export default TeamForm;
