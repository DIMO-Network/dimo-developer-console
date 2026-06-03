import { FC, useEffect, useState } from 'react';
import { FragmentType, useFragment } from '@/gql';
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
import { USER_CONFIG_FRAGMENT } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm';
import { Button } from '@/components/Button';
import configuration from '@/config';
import { toast } from 'sonner';
import { fetchMyBrands } from '@/actions/brand';
import { getWorkspace, getWorkspaceByTokenId } from '@/actions/workspace';

interface Props {
  license: FragmentType<typeof USER_CONFIG_FRAGMENT>;
  submit: (data: DynamicFormProps) => void;
}

interface IFormProps {
  component: ComponentType;
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  brandNames?: string[];
}

const Configuration: FC<IFormProps> = ({
  component,
  control,
  register,
  brandNames,
}: IFormProps) => {
  switch (component) {
    case 'LoginWithDimo':
      return (
        <LoginWithDimoConfiguration
          control={control}
          register={register}
          brandNames={brandNames}
        />
      );
    case 'ShareVehiclesWithDimo':
      return (
        <ShareVehiclesWithDimoConfiguration
          control={control}
          register={register}
          brandNames={brandNames}
        />
      );
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
  const fragment = useFragment(USER_CONFIG_FRAGMENT, license);
  const [brandNames, setBrandNames] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const ws =
          (await getWorkspaceByTokenId(fragment.tokenId)) ?? (await getWorkspace());
        if (!ws?.id) return;
        const brands = await fetchMyBrands(ws.id);
        setBrandNames(brands.map((b) => b.name).filter((n): n is string => !!n));
      } catch {
        // brand names are optional — silently ignore
      }
    };
    void load();
  }, [fragment.tokenId]);

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useFormContext<DynamicFormProps>();
  const component = watch('component', 'ShareVehiclesWithDimo');
  const configurationId = watch('configuration_id');

  const getBaseUrl = (): string => {
    if (configuration.environment === 'production') {
      return 'https://login.dimo.org';
    }
    return 'https://login.dev.dimo.org';
  };

  const handleCopyConfigurationLink = () => {
    if (!configurationId) {
      toast.error('Configuration ID is not available');
      return;
    }
    const url = `${getBaseUrl()}/?configurationId=${configurationId}`;
    navigator.clipboard.writeText(url);
    toast.success('Configuration link copied to clipboard');
  };

  return (
    <>
      <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit(submit)}>
        <div className="flex flex-row w-full gap-4">
          <Label htmlFor="website" className="text-xs text-medium w-full">
            Configuration Id
            <div className="flex gap-2 items-center">
              <TextField
                type="text"
                placeholder=""
                {...register('configuration_id', {
                  required: false,
                  validate: {},
                })}
                role="company-website-input"
                readOnly
              />
              <button
                type="button"
                onClick={handleCopyConfigurationLink}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 whitespace-nowrap"
                title="Copy configuration link"
              >
                Copy Link
              </button>
            </div>
          </Label>
        </div>
        <div className="flex flex-row w-full gap-4">
          <Label htmlFor="website" className="text-xs text-medium w-full">
            Configuration name
            <TextField
              type="text"
              placeholder=""
              {...register('configuration_name', {
                required: 'Configuration name is required',
              })}
              role="company-website-input"
            />
            {errors.configuration_name && (
              <p className="text-xs text-red-500 mt-1">
                {errors.configuration_name.message}
              </p>
            )}
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
          <Label htmlFor="redirectUri" className="text-xs text-medium w-full">
            Redirect URI
            <SelectField
              {...register('redirectUri', {
                required: 'Redirect URI is required',
              })}
              options={fragment.redirectURIs.nodes.map((node) => ({
                value: node.uri,
                text: node.uri,
              }))}
              control={control}
              placeholder="Select"
              role="redirectUri-select"
            />
            {errors.redirectUri && (
              <p className="text-xs text-red-500 mt-1">{errors.redirectUri.message}</p>
            )}
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
          brandNames={brandNames}
        />
        <Button type="submit" className="primary">
          Update
        </Button>
      </form>
    </>
  );
};
