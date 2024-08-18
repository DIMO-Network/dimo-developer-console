import _ from 'lodash';

import { isEmail } from 'validator';
import { useForm } from 'react-hook-form';
import { useState } from 'react';

import config from '@/config';

import { Button } from '@/components/Button';
import { IInvitation } from '@/types/team';
import { inviteCollaborator } from '@/actions/team';
import { Label } from '@/components/Label';
import { LoadingModal, LoadingProps } from '@/components/LoadingModal';
import { PlusIcon } from '@/components/Icons';
import { SelectField } from '@/components/SelectField';
import { TextError } from '@/components/TextError';
import { TextField } from '@/components/TextField';

import './TeamForm.css';

const roleOptions = config.ROLES.map((roleName) => ({
  value: roleName,
  text: roleName,
})) as { value: string; text: string }[];

export const TeamForm = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
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
  });

  const onSubmit = async () => {
    setIsLoading(true);
    setIsOpened(true);
    try {
      setLoadingStatus({
        label: 'Sending the invitation',
        status: 'loading',
      });
      const invitation = getValues();
      invitation.role = invitation.role.toUpperCase();
      await inviteCollaborator(invitation);
      setLoadingStatus({
        label: 'Invitation sent',
        status: 'success',
      });
      reset();
    } catch (error: unknown) {
      setLoadingStatus({
        label: _.get(error, 'message'),
        status: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="form-team-invitation" onSubmit={handleSubmit(onSubmit)}>
      <div className="field">
        <Label htmlFor="email" className="text-xs text-medium">
          Email
          <TextField
            type="text"
            placeholder="Email"
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
            placeholder="Select"
            role="company-region"
          />
          {errors.role && (
            <TextError errorMessage={errors.role.message ?? ''} />
          )}
        </Label>
      </div>
      <div className="cta">
        <Button
          className="primary-outline px-4 w-full"
          loading={isLoading}
          loadingColor="primary"
        >
          <PlusIcon className="w-5 h-5 mr-2" />
          Invite
        </Button>
      </div>
      <LoadingModal
        isOpen={isOpened}
        setIsOpen={setIsOpened}
        {...loadingStatus}
      />
    </form>
  );
};

export default TeamForm;
