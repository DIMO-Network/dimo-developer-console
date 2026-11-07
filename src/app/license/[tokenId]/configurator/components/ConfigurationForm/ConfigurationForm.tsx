import { FC } from 'react';
import { useTranslations } from 'next-intl';
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
import { useLicenseBrands } from '@/hooks/useLicenseBrands';
import { OutputPrint } from '@/app/license/[tokenId]/configurator/components/OutputPrint/OutputPrint';
import { configurationLink } from '@/app/license/[tokenId]/configurator/utils/configuration';
import { OwnerAction } from '@/components/OwnerOnly';
import { toast } from 'sonner';
import Link from 'next/link';

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
  const t = useTranslations('configurator');
  const fragment = useFragment(USER_CONFIG_FRAGMENT, license);
  const brandNames = (useLicenseBrands(fragment.tokenId).data?.brands ?? [])
    .map((b) => b.name)
    .filter((n): n is string => !!n);

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
      toast.error(t('form.basics.idUnavailable'));
      return;
    }
    void navigator.clipboard.writeText(configurationLink(configurationId));
    toast.success(t('form.basics.linkCopied'));
  };

  return (
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start">
      {/* LEFT: form */}
      <form className="flex flex-col gap-4" onSubmit={handleSubmit(submit)}>
        {/* Basics */}
        <div className="rounded-card bg-card p-4 flex flex-col gap-4">
          <h3 className="text-card-title text-ink">{t('form.basics.title')}</h3>
          {editing && (
            <Label className="w-full">
              {t('form.basics.configurationId')}
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
                  {t('form.basics.copyLink')}
                </Button>
              </div>
            </Label>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Label>
              {t('form.basics.name')}
              <TextField
                type="text"
                placeholder={t('form.basics.namePlaceholder')}
                {...register('configuration_name', {
                  required: t('form.basics.nameRequired'),
                })}
                role="company-website-input"
              />
              {errors.configuration_name && (
                <TextError errorMessage={errors.configuration_name.message!} />
              )}
            </Label>
            <Label>
              {t('form.basics.clientId')}
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
          <h3 className="text-card-title text-ink">{t('form.component.title')}</h3>
          <SegmentedControl
            name="component"
            options={[
              { value: 'LoginWithDimo', label: `🔑  ${t('form.component.login')}` },
              {
                value: 'ShareVehiclesWithDimo',
                label: `🚗  ${t('form.component.share')}`,
              },
            ]}
            role="component-segmented"
            control={control}
          />
        </div>

        {/* Connection */}
        <div className="rounded-card bg-card p-4 flex flex-col gap-4">
          <h3 className="text-card-title text-ink">{t('form.connection.title')}</h3>
          <Label htmlFor="redirectUri">
            {t('form.connection.redirectUri')}
            <SelectField
              name="redirectUri"
              rules={{ required: t('form.connection.redirectUriRequired') }}
              options={fragment.redirectURIs.nodes.map((node) => ({
                value: node.uri,
                text: node.uri,
              }))}
              control={control}
              placeholder={t('form.connection.select')}
              role="redirectUri-select"
            />
            {errors.redirectUri && (
              <TextError errorMessage={errors.redirectUri.message!} />
            )}
            {fragment.redirectURIs.nodes.length === 0 && (
              <p className="text-label font-normal text-muted">
                {t('form.connection.noRedirectUri')}{' '}
                <Link
                  href={`/license/${fragment.tokenId}/details?tab=config`}
                  className="text-ink underline"
                >
                  {t('form.connection.goToConfigTab')}
                </Link>
              </p>
            )}
          </Label>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Label>
              {needsEndDate
                ? t('form.connection.expirationDate')
                : t('form.connection.expirationDateSharingOnly')}
              <Controller
                control={control}
                name="expirationDate"
                rules={{
                  validate: (value) => {
                    if (!value)
                      return needsEndDate
                        ? t('form.connection.expirationDateRequired')
                        : true;
                    return (
                      new Date(value) >= startOfToday() ||
                      t('form.connection.expirationDateTooEarly')
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
              {t('form.connection.utm')}
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
          licenseOwner={fragment.owner}
          fallback={<p className="text-body-sm text-muted">{t('form.ownerOnly')}</p>}
        >
          <Button type="submit" className="w-full">
            {editing ? t('form.update') : t('form.save')}
          </Button>
        </OwnerAction>
      </form>

      {/* RIGHT: sticky preview */}
      <div className="sticky top-6 hidden lg:block">
        {editing ? (
          <div className="overflow-hidden rounded-card bg-card">
            <div className="px-4 pt-3">
              <p className="text-label text-muted">{t('form.preview.generatedOutput')}</p>
            </div>
            <div className="p-4">
              <OutputPrint clientId={fragment.clientId} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-card bg-card p-6 text-center">
            <p className="text-body-sm font-medium text-ink">
              {t('form.preview.saveToGenerate')}
            </p>
            <p className="text-label font-normal text-muted">
              {t.rich('form.preview.afterSaving', {
                code: (chunks) => (
                  <code className="rounded-chip bg-control px-1.5 py-0.5 font-mono text-code text-fg">
                    {chunks}
                  </code>
                ),
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
