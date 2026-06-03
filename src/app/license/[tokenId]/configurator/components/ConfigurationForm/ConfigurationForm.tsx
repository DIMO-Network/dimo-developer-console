import { FC, useEffect, useState } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { Label } from '@/components/Label';
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
import { Button } from '@/components/Button';
import { DatePicker } from '@/components/DatePicker';
import { fetchMyBrands } from '@/actions/brand';
import { getWorkspace, getWorkspaceByTokenId } from '@/actions/workspace';
import { OutputPrint } from '@/app/license/[tokenId]/configurator/components/OutputPrint/OutputPrint';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';

export const USER_CONFIG_FRAGMENT = gql(`
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

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">
      {/* LEFT: form */}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)}>
        {/* Basics */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
            Basics
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Label className="text-xs font-medium flex flex-col gap-1">
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
                <p className="text-xs text-red-500">
                  {errors.configuration_name.message}
                </p>
              )}
            </Label>
            <Label className="text-xs font-medium flex flex-col gap-1">
              Client ID
              <TextField
                type="text"
                readOnly
                value={fragment?.clientId}
                {...register('client_id', { required: false })}
                role="company-website-input"
              />
            </Label>
          </div>
        </div>

        {/* Component */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
            Component
          </p>
          <SegmentedControl
            name="component"
            options={[
              { value: 'LoginWithDimo', label: '🔑  Login With DIMO' },
              { value: 'ShareVehiclesWithDimo', label: '🚗  Share Vehicles with DIMO' },
            ]}
            role="component-segmented"
            control={control}
          />
        </div>

        {/* Connection */}
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
            Connection
          </p>
          <Label className="text-xs font-medium flex flex-col gap-1">
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
              <p className="text-xs text-red-500">{errors.redirectUri.message}</p>
            )}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            <Label className="text-xs font-medium flex flex-col gap-1">
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
                <p className="text-xs text-red-500">{errors.expirationDate.message}</p>
              )}
            </Label>
            <Label className="text-xs font-medium flex flex-col gap-1">
              UTM
              <TextField
                type="text"
                placeholder="utm_source=myapp"
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

        <Button type="submit" className="primary w-full">
          Save
        </Button>
      </form>

      {/* RIGHT: sticky preview */}
      <div className="sticky top-6 hidden lg:block">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Generated Output
            </p>
          </div>
          <div className="p-4">
            <OutputPrint license={licenseSummary} />
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground leading-relaxed">
          <strong className="text-primary block mb-1">How to use this output</strong>
          Save the configuration to get a{' '}
          <code className="bg-primary/10 px-1 rounded text-[10px]">
            configurationId
          </code>{' '}
          you can pass directly to the SDK, or copy the generated snippet into your app.
        </div>
      </div>
    </div>
  );
};
