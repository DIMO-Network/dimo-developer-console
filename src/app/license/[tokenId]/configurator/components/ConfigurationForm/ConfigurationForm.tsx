import { FC, useEffect, useState } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { Label } from '@/components/Label';
import { TextError } from '@/components/TextError';
import { SelectField } from '@/components/SelectField';
import { Control, Controller, UseFormRegister, useFormContext } from 'react-hook-form';
import { LoginWithDimoConfiguration } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/LoginWithDimoConfiguration';
import { ShareVehiclesWithDimoConfiguration } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/ShareVehiclesWithDimoConfiguration';
import { ExecuteAdvanceTransactionWithDimoConfiguration } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/ExecuteAdvanceTransactionWithDimoConfiguration';
import { SignInWindowFields } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/SignInWindowFields';
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
import { configurationLink } from '@/app/license/[tokenId]/configurator/utils/configuration';
import { OwnerAction } from '@/components/OwnerOnly';
import { toast } from 'sonner';

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
  submit: (data: DynamicFormProps) => void;
  /** The edit page: shows the configuration's ID and link, and Update. */
  editing?: boolean;
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

// The end date is a calendar day; today is the earliest that grants anything.
const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

/** The configuration form, for the new and the edit page. */
export const ConfigurationForm: FC<Props> = ({ license, submit, editing = false }) => {
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
  // Only a share signs a grant that ends; a plain login ignores the date.
  const needsEndDate = component === 'ShareVehiclesWithDimo';

  const handleCopyConfigurationLink = () => {
    if (!configurationId) {
      toast.error('Configuration ID is not available');
      return;
    }
    void navigator.clipboard.writeText(configurationLink(configurationId));
    toast.success('Configuration link copied to clipboard');
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">
      {/* LEFT: form */}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)}>
        {/* Basics */}
        <div className="rounded-card bg-card p-4 flex flex-col gap-4">
          <h3 className="text-card-title text-ink">Basics</h3>
          {editing && (
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
          )}
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
              name="redirectUri"
              rules={{ required: 'Redirect URI is required' }}
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
              {needsEndDate ? 'Expiration date' : 'Expiration date (sharing only)'}
              <Controller
                control={control}
                name="expirationDate"
                rules={{
                  validate: (value) => {
                    if (!value)
                      return needsEndDate ? 'Expiration date is required' : true;
                    return (
                      new Date(value) >= startOfToday() || 'Pick today or a later date'
                    );
                  },
                }}
                render={({ field }) => (
                  <DatePicker
                    value={field.value ? new Date(field.value) : undefined}
                    onChange={(value) => field.onChange(value ?? '')}
                    min={startOfToday()}
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

        <SignInWindowFields control={control} />

        {/* Component-specific settings */}
        <Configuration
          component={component}
          control={control}
          register={register}
          brandNames={brandNames}
        />

        <OwnerAction
          fallback={
            <p className="text-body-sm text-muted">
              Only the team owner can change configurations.
            </p>
          }
        >
          <Button type="submit" className="w-full">
            {editing ? 'Update' : 'Save'}
          </Button>
        </OwnerAction>
      </form>

      {/* RIGHT: sticky preview */}
      <div className="sticky top-6 hidden lg:block">
        {editing ? (
          <div className="overflow-hidden rounded-card bg-card">
            <div className="px-4 pt-3">
              <p className="text-label text-muted">Generated output</p>
            </div>
            <div className="p-4">
              <OutputPrint clientId={fragment.clientId} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-card bg-card p-6 text-center">
            <p className="text-body-sm font-medium text-ink">
              Save to generate your link
            </p>
            <p className="text-label font-normal text-muted">
              After saving, you&apos;ll get a short{' '}
              <code className="rounded-chip bg-control px-1.5 py-0.5 font-mono text-code text-fg">
                configurationId
              </code>{' '}
              link you can share directly with users.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
