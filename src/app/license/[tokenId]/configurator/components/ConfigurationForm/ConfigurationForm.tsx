import { FC } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { Control, UseFormRegister, useFormContext } from 'react-hook-form';
import { LoginWithDimoConfiguration } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/LoginWithDimoConfiguration';
import { ShareVehiclesWithDimoConfiguration } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/ShareVehiclesWithDimoConfiguration';
import { ExecuteAdvanceTransactionWithDimoConfiguration } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/ExecuteAdvanceTransactionWithDimoConfiguration';
import {
  DynamicFormProps,
  ComponentType,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';

const FRAGMENT_USER_CONFIG = gql(`
  fragment UserConfigurationFragment on DeveloperLicense {
    tokenId
    clientId
    owner
    redirectURIs(first:100) {
      nodes {
        uri
      }
    }
  }
`);

interface Props {
  license: FragmentType<typeof FRAGMENT_USER_CONFIG>;
  submit: (data: DynamicFormProps) => void;
}

interface IFormProps {
  component: ComponentType;
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
}

const Configuration: FC<IFormProps> = ({ component, control, register }: IFormProps) => {
  switch (component) {
    case 'LoginWithDimo':
      return <LoginWithDimoConfiguration control={control} register={register} />;
    case 'ShareVehiclesWithDimo':
      return <ShareVehiclesWithDimoConfiguration control={control} register={register} />;
    case 'ExecuteAdvancedTransactionWithDimo':
      return (
        <ExecuteAdvanceTransactionWithDimoConfiguration
          control={control}
          register={register}
        />
      );
    default:
      return <></>;
  }
};

export const ConfigurationForm: FC<Props> = ({ license, submit }) => {
  const fragment = useFragment(FRAGMENT_USER_CONFIG, license);

  const { register, control, watch, handleSubmit } = useFormContext<DynamicFormProps>();
  const component = watch('component', 'LoginWithDimo');

  return (
    <>
      <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit(submit)}>
        <div className="flex flex-row w-full gap-4">
          <Label htmlFor="website" className="text-xs text-medium w-full">
            Configuration name
            <TextField
              type="text"
              placeholder=""
              {...register('configuration_name', {
                required: false,
                validate: {},
              })}
              role="company-website-input"
            />
          </Label>
          <Label htmlFor="website" className="text-xs text-medium w-full">
            Client Id
            <TextField
              type="text"
              placeholder=""
              readOnly={true}
              value={fragment?.clientId}
              {...register('client_id', {
                required: false,
                validate: {},
              })}
              role="company-website-input"
            />
          </Label>
        </div>
        <div>
          <Label htmlFor="component" className="text-xs text-medium">
            Which component?
            <SegmentedControl
              name="component"
              options={[
                { value: 'LoginWithDimo', label: 'Login With DIMO' },
                { value: 'ShareVehiclesWithDimo', label: 'Share Vehicles with DIMO' },
              ]}
              role="component-segmented"
              control={control}
            />
          </Label>
        </div>
        <div className="flex flex-row w-full gap-4">
          <Label htmlFor="mode" className="text-xs text-medium w-full">
            Mode
            <SelectField
              {...register('mode', {
                required: 'This field is required',
              })}
              options={[
                { value: 'popup', text: 'Popup' },
                { value: 'redirect', text: 'Redirect' },
              ]}
              control={control}
              placeholder="Select"
              role="mode-select"
            />
          </Label>
          <Label htmlFor="redirectUri" className="text-xs text-medium w-full">
            Redirect URI
            <SelectField
              {...register('redirectUri', {
                required: 'This field is required',
              })}
              options={fragment.redirectURIs.nodes.map((node) => ({
                value: node.uri,
                text: node.uri,
              }))}
              control={control}
              placeholder="Select"
              role="redirectUri-select"
            />
          </Label>
          <Label htmlFor="website" className="text-xs text-medium w-full">
            UTM
            <TextField
              type="text"
              placeholder=""
              {...register('utm', {
                required: false,
                validate: {},
              })}
              role="company-website-input"
            />
          </Label>
        </div>
        <Configuration component={component} control={control} register={register} />
        <button type="submit" className="btn btn-primary">
          Save
        </button>
      </form>
    </>
  );
};
