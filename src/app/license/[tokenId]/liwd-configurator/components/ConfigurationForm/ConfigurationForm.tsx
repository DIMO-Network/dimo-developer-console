import { FC } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { Control, FieldErrors, UseFormRegister, UseFormWatch } from 'react-hook-form';
import { LoginWithDimoConfiguration } from '@/app/license/[tokenId]/liwd-configurator/components/ConfigurationForm/LoginWithDimoConfiguration';
import { ShareVehiclesWithDimoConfiguration } from '@/app/license/[tokenId]/liwd-configurator/components/ConfigurationForm/ShareVehiclesWithDimoConfiguration';
import { ExecuteAdvanceTransactionWithDimoConfiguration } from '@/app/license/[tokenId]/liwd-configurator/components/ConfigurationForm/ExecuteAdvanceTransactionWithDimoConfiguration';
import {
  DynamicFormProps,
  ComponentType,
} from '@/app/license/[tokenId]/liwd-configurator/components/ConfigurationForm/types';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TextField } from '@/components/TextField';

const REDIRECT_URIS_FRAGMENT = gql(`
  fragment RedirectUriFragment on DeveloperLicense {
    owner
    tokenId
    redirectURIs(first:100) {
      nodes {
        uri
      }
    }
  }
`);

interface Props {
  license: FragmentType<typeof REDIRECT_URIS_FRAGMENT>;
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  errors: FieldErrors<DynamicFormProps>;
  watch: UseFormWatch<DynamicFormProps>;
}

interface IFormProps {
  component: ComponentType;
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  errors: FieldErrors<DynamicFormProps>;
}

const Configuration: FC<IFormProps> = ({
  component,
  control,
  register,
  errors,
}: IFormProps) => {
  switch (component) {
    case 'LoginWithDimo':
      return (
        <LoginWithDimoConfiguration
          control={control}
          register={register}
          errors={errors}
        />
      );
    case 'ShareVehiclesWithDimo':
      return (
        <ShareVehiclesWithDimoConfiguration
          control={control}
          register={register}
          errors={errors}
        />
      );
    case 'ExecuteAdvancedTransactionWithDimo':
      return (
        <ExecuteAdvanceTransactionWithDimoConfiguration
          control={control}
          register={register}
          errors={errors}
        />
      );
    default:
      return <></>;
  }
};

export const ConfigurationForm: FC<Props> = ({
  license,
  watch,
  control,
  register,
  errors,
}) => {
  const fragment = useFragment(REDIRECT_URIS_FRAGMENT, license);

  const component = watch('component', 'LoginWithDimo');

  return (
    <>
      <form className="flex flex-col gap-4 w-full">
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
        <Configuration
          component={component}
          control={control}
          register={register}
          errors={errors}
        />
      </form>
    </>
  );
};
