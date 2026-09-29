import { FC, useEffect, useState } from 'react';
import { FragmentType, useFragment } from '@/gql';
import { Label } from '@/components/Label';
import { TextError } from '@/components/TextError';
import { SelectField } from '@/components/SelectField';
import { Control, Controller, UseFormRegister, useFormContext } from 'react-hook-form';
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
import { DatePicker } from '@/components/DatePicker';
import configuration from '@/config';
import { toast } from 'sonner';
import { fetchMyBrands } from '@/actions/brand';
import { getWorkspace, getWorkspaceByTokenId } from '@/actions/workspace';
import { OutputPrint } from '@/app/license/[tokenId]/configurator/components/OutputPrint/OutputPrint';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';

interface Props {
  license: FragmentType<typeof USER_CONFIG_FRAGMENT>;
  licenseSummary: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT>;
  submit: (data: DynamicFormProps) => void;
}

interface IFormProps {
  component: ComponentType;
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  brandNames?: string[];
}

const Configuration: FC<IFormProps> = ({ component, control, register, brandNames }) => {
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

export const ConfigurationForm: FC<Props> = ({ license, licenseSummary, submit }) => {
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
        // brand names are optional
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

  const getBaseUrl = (): string =>
    configuration.environment === 'production'
      ? 'https://login.dimo.org'
      : 'https://login.dev.dimo.org';

  const handleCopyConfigurationLink = () => {
    if (!configurationId) {
      toast.error('Configuration ID is not available');
      return;
    }
    navigator.clipboard.writeText(`${getBaseUrl()}/?configurationId=${configurationId}`);
    toast.success('Configuration link copied to clipboard');
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">
      {/* LEFT: form */}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)}>
        {/* Basics */}
        <div className="rounded-card bg-card p-4 flex flex-col gap-4">
          <h3 className="text-card-title text-ink">Basics</h3>
          <Label className="w-full">
            Configuration ID
            <div className="flex gap-2 items-center">
              <div className="flex-1 min-w-0">
                <TextField
                  type="text"
                  readOnly
                  {...register('configuration_id', { required: false })}
                  role="company-website-input"
                  className="font-mono text-code"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="shrink-0"
                onClick={handleCopyConfigurationLink}
              >
                Copy link
              </Button>
            </div>
          </Label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Label>
              Configuration name
              <TextField
                type="text"
                placeholder="e.g. My App – Production"
                {...register('configuration_name', {
                  required: 'Configuration name is required',
                })}
                role="company-website-input"
              />
              {errors.configuration_name && (
                <TextError errorMessage={errors.configuration_name.message!} />
              )}
            </Label>
            <Label>
              Client ID
              <TextField
                type="text"
                readOnly
                value={fragment?.clientId}
                {...register('client_id', { required: false })}
                role="company-website-input"
                className="font-mono text-code"
              />
            </Label>
          </div>
        </div>

        {/* Component */}
        <div className="rounded-card bg-card p-4 flex flex-col gap-4">
          <h3 className="text-card-title text-ink">Component</h3>
          <SegmentedControl
            name="component"
            options={[
              { value: 'LoginWithDimo', label: '🔑  Login with DIMO' },
              { value: 'ShareVehiclesWithDimo', label: '🚗  Share vehicles with DIMO' },
            ]}
            role="component-segmented"
            control={control}
          />
        </div>

        {/* Connection */}
        <div className="rounded-card bg-card p-4 flex flex-col gap-4">
          <h3 className="text-card-title text-ink">Connection</h3>
          <Label htmlFor="redirectUri">
            Redirect URI
            <SelectField
              {...register('redirectUri', { required: 'Redirect URI is required' })}
              options={fragment.redirectURIs.nodes.map((node) => ({
                value: node.uri,
                text: node.uri,
              }))}
              control={control}
              placeholder="Select"
              role="redirectUri-select"
            />
            {errors.redirectUri && (
              <TextError errorMessage={errors.redirectUri.message!} />
            )}
          </Label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Label>
              Expiration date
              <Controller
                control={control}
                name="expirationDate"
                rules={{ required: 'Expiration date is required' }}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onChange={(value) => field.onChange(value ?? '')}
                  />
                )}
              />
              {errors.expirationDate && (
                <TextError errorMessage={errors.expirationDate.message!} />
              )}
            </Label>
            <Label>
              UTM
              <TextField
                type="text"
                placeholder="utm_source=myapp"
                wrapperClassName="light-placeholder"
                {...register('utm', { required: false, validate: {} })}
                role="company-website-input"
              />
            </Label>
          </div>
        </div>

        {/* Component-specific settings */}
        <Configuration
          component={component}
          control={control}
          register={register}
          brandNames={brandNames}
        />

        <Button type="submit" className="w-full">
          Update
        </Button>
      </form>

      {/* RIGHT: sticky preview */}
      <div className="sticky top-6 hidden lg:block">
        <div className="overflow-hidden rounded-card bg-card">
          <div className="px-4 pt-3">
            <p className="text-label text-muted">Generated output</p>
          </div>
          <div className="p-4">
            <OutputPrint license={licenseSummary} />
          </div>
        </div>
      </div>
    </div>
  );
};
