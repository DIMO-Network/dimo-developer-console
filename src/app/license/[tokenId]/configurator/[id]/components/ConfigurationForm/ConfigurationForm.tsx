import { FC, useContext, useEffect, useState } from 'react';
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
import { NotificationContext } from '@/context/notificationContext';
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
  const { setNotification } = useContext(NotificationContext);
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

  const { register, control, watch, handleSubmit } = useFormContext<DynamicFormProps>();
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
      setNotification('Configuration ID is not available', '', 'error');
      return;
    }
    const url = `${getBaseUrl()}/?configurationId=${configurationId}`;
    navigator.clipboard.writeText(url);
    setNotification('Configuration link copied to clipboard', '', 'success');
  };

  return (
    <>
      <form className="flex flex-col gap-4 w-full" onSubmit={handleSubmit(submit)}>
        <div className="flex flex-row w-full gap-4">
          <Label htmlFor="website" className="w-full">
            Configuration ID
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
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopyConfigurationLink}
                className="whitespace-nowrap"
                title="Copy configuration link"
              >
                Copy link
              </Button>
            </div>
          </Label>
        </div>
        <div className="flex flex-row w-full gap-4">
          <Label htmlFor="website" className="w-full">
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
          <Label htmlFor="website" className="w-full">
            Client ID
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
              className="font-mono text-code"
            />
          </Label>
        </div>
        <div>
          <Label htmlFor="component">
            Which component?
            <SegmentedControl
              name="component"
              options={[
                { value: 'LoginWithDimo', label: 'Login with DIMO' },
                { value: 'ShareVehiclesWithDimo', label: 'Share vehicles with DIMO' },
              ]}
              role="component-segmented"
              control={control}
            />
          </Label>
        </div>
        <div className="flex flex-row w-full gap-4">
          <Label htmlFor="redirectUri" className="w-full">
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
          <Label htmlFor="website" className="w-full">
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
        <Button type="submit">Update</Button>
      </form>
    </>
  );
};
