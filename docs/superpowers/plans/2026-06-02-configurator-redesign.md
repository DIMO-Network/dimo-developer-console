# Configurator Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the configurator new/edit pages to a split-panel layout with section cards, icons on the component selector pill tabs, expiration date promoted to the Connection section, and a ToS URL field in Share Vehicles.

**Architecture:** Both `ConfigurationForm` components (new + edit) gain a `lg:grid lg:grid-cols-[1fr_360px]` wrapper — form sections scroll on the left, a sticky `OutputPrint` preview card sits on the right. Form fields are regrouped into labelled section cards (Basics, Component, Connection). Expiration Date moves out of the sub-components into the Connection section. Each sub-component (`LoginWithDimoConfiguration`, `ShareVehiclesWithDimoConfiguration`) renders its own section card(s). A ToS URL section card is added at the bottom of the Share Vehicles sub-component. `tosUrl` is added to `SharedProps` and wired into `buildJson` in both View files.

**Tech Stack:** Next.js App Router, TypeScript, React Hook Form (Controller, useFormContext, useWatch), Tailwind CSS semantic tokens, Apollo Client / gql fragments, shadcn/ui Input

---

### Task 1: Add `tosUrl` to SharedProps

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/components/ConfigurationForm/types.ts`

- [ ] **Step 1: Add `tosUrl` to the SharedProps interface**

```ts
interface SharedProps {
  client_id: string;
  configuration_name: string;
  configuration_id: string;
  redirectUri: string;
  mode: 'popup' | 'redirect';
  utm: string | null;
  altTitle: boolean;
  authenticatedLabel: string;
  unAuthenticatedLabel: string;
  expirationDate: string;
  tosUrl?: string | null;
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npm run compile
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/license/\[tokenId\]/configurator/components/ConfigurationForm/types.ts
git commit -m "feat(configurator): add tosUrl to SharedProps"
```

---

### Task 2: Remove expiration date from both sub-components

The Connection section card in the main form will own `expirationDate` going forward. Remove it from `LoginWithDimoConfiguration` and `ShareVehiclesWithDimoConfiguration` so it isn't rendered twice.

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/components/ConfigurationForm/LoginWithDimoConfiguration.tsx`
- Modify: `src/app/license/[tokenId]/configurator/components/ConfigurationForm/ShareVehiclesWithDimoConfiguration.tsx`

- [ ] **Step 1: Rewrite `LoginWithDimoConfiguration.tsx` without expiration date**

Replace the entire file:

```tsx
import { FC } from 'react';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import { Control, UseFormRegister } from 'react-hook-form';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';

interface IFormProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  brandNames?: string[];
}

export const LoginWithDimoConfiguration: FC<IFormProps> = ({
  register,
  control,
  brandNames = [],
}: IFormProps) => {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
        Login Settings
      </p>
      <div className="flex flex-row gap-3 w-full">
        <Label className="text-xs font-medium w-full flex flex-col gap-1">
          Vehicles
          <TextField
            type="text"
            placeholder="1,2,3"
            {...register('vehicles', { required: false, validate: {} })}
            role="company-website-input"
          />
        </Label>
        <Label className="text-xs font-medium w-full flex flex-col gap-1">
          Vehicle Makes
          <TextField
            type="text"
            placeholder="toyota, mazda..."
            {...register('vehicleMakes', { required: false, validate: {} })}
            role="company-website-input"
          />
        </Label>
      </div>
      <div className="flex flex-row gap-3 w-full">
        <Label className="text-xs font-medium w-full flex flex-col gap-1">
          Powertrain Types
          <TextField
            type="text"
            placeholder="ICE, HEV..."
            {...register('powerTrainTypes', { required: false, validate: {} })}
            role="company-website-input"
          />
        </Label>
      </div>
      {brandNames.length > 1 && (
        <Label className="text-xs font-medium w-full flex flex-col gap-1">
          Brand
          <p className="text-muted-foreground font-normal text-[11px]">
            Which brand to show on the Login with DIMO button. Leave as
            &quot;Default&quot; to use your workspace default brand.
          </p>
          <SelectField
            {...register('brandName', { required: false })}
            options={[
              { value: '', text: 'Default' },
              ...brandNames.map((name) => ({ value: name, text: name })),
            ]}
            control={control}
            placeholder="Default"
            role="brandName-select"
          />
        </Label>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Remove expiration date from `ShareVehiclesWithDimoConfiguration.tsx`**

Remove the first `div` block (the one containing the Expiration Date Controller and its error message):

```tsx
<div className={'flex flex-row gap-4 w-full'}>
  <Label htmlFor="website" className="text-xs text-medium w-full">
    Expiration Date
    <Controller
      control={control}
      name="expirationDate"
      rules={{ required: 'Expiration date is required' }}
      render={({ field }) => (
        <div className={'w-full'}>
          <DatePicker
            value={field.value ? new Date(field.value) : undefined}
            onChange={(value) => field.onChange(value ?? '')}
          />
        </div>
      )}
    />
    {errors.expirationDate && (
      <p className="text-xs text-red-500 mt-1">{errors.expirationDate.message}</p>
    )}
  </Label>
</div>
```

Also remove these now-unused imports from `ShareVehiclesWithDimoConfiguration.tsx`:

- `DatePicker` from `@/components/DatePicker`
- `TextField` from `@/components/TextField` (temporarily; re-added in Task 3)

Update the `useFormContext` destructure to remove `errors` (only `setValue` is needed now):

```tsx
const { setValue } = useFormContext<DynamicFormProps>();
```

- [ ] **Step 3: Run lint**

```bash
npm run lint -- --quiet
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add \
  src/app/license/\[tokenId\]/configurator/components/ConfigurationForm/LoginWithDimoConfiguration.tsx \
  src/app/license/\[tokenId\]/configurator/components/ConfigurationForm/ShareVehiclesWithDimoConfiguration.tsx
git commit -m "refactor(configurator): move expiration date out of sub-components into main form"
```

---

### Task 3: Wrap ShareVehiclesWithDimoConfiguration in section cards and add ToS URL

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/components/ConfigurationForm/ShareVehiclesWithDimoConfiguration.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
import { FC } from 'react';
import { TextField } from '@/components/TextField';
import { Label } from '@/components/Label';
import { SelectField } from '@/components/SelectField';
import {
  Control,
  Controller,
  UseFormRegister,
  useWatch,
  useFormContext,
} from 'react-hook-form';
import {
  DynamicFormProps,
  PERMISSIONS,
  ATTESTATION_TAGS,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Toggle } from '@/components/Toggle';

interface IFormProps {
  register: UseFormRegister<DynamicFormProps>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<DynamicFormProps, any>;
  brandNames?: string[];
}

type PermissionCardProps = {
  selected: boolean;
  title: string;
  description: string;
  onToggle: () => void;
};

const PermissionCard = ({
  selected,
  title,
  description,
  onToggle,
}: PermissionCardProps) => (
  <div
    onClick={onToggle}
    className={`cursor-pointer border rounded-md px-3 py-2 transition-colors ${
      selected
        ? 'border-primary bg-primary/10 ring-1 ring-primary'
        : 'border-border bg-accent hover:border-primary/50'
    }`}
  >
    <h4 className="font-medium text-xs">{title}</h4>
    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
      {description}
    </p>
  </div>
);

export const ShareVehiclesWithDimoConfiguration: FC<IFormProps> = ({
  register,
  control,
  brandNames = [],
}: IFormProps) => {
  const permissionsMode = useWatch({
    control,
    name: 'permissionsMode',
    defaultValue: 'template',
  });
  const requireAttestation = useWatch({ control, name: 'requireAttestation' });
  const { setValue } = useFormContext<DynamicFormProps>();

  return (
    <>
      {/* Vehicle Permissions */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
          Vehicle Permissions
        </p>
        <SegmentedControl
          options={[
            { value: 'template', label: 'Use Permission Template' },
            { value: 'custom', label: 'Custom Permissions' },
          ]}
          control={control}
          name="permissionsMode"
          role="permission-segmented"
        />
        {permissionsMode === 'template' && (
          <Label className="text-xs font-medium flex flex-col gap-1">
            Permissions Template ID
            <TextField
              type="text"
              placeholder="1"
              {...register('permissionTemplateId', { required: false, validate: {} })}
              role="company-website-input"
            />
          </Label>
        )}
        {permissionsMode === 'custom' && (
          <Controller
            name="permissions"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                {PERMISSIONS.map((p) => (
                  <PermissionCard
                    key={p.key}
                    title={p.title}
                    description={p.description}
                    selected={field.value?.includes(p.key)}
                    onToggle={() => {
                      if (field.value?.includes(p.key)) {
                        field.onChange(field.value.filter((v: string) => v !== p.key));
                      } else {
                        field.onChange([...(field.value || []), p.key]);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          />
        )}
        <div className="flex flex-col gap-3">
          <Controller
            name="requireAttestation"
            control={control}
            render={({ field }) => (
              <div className="flex flex-row gap-2 items-center">
                <Toggle
                  checked={field.value}
                  onToggle={(checked) => {
                    field.onChange(checked);
                    if (!checked) setValue('attestation.tags', []);
                  }}
                />
                <label className="text-sm font-medium">Attestations</label>
              </div>
            )}
          />
          {requireAttestation && (
            <Controller
              name="attestation.tags"
              control={control}
              defaultValue={[]}
              render={({ field }) => (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
                  {ATTESTATION_TAGS.map((p) => (
                    <PermissionCard
                      key={p.value}
                      title={p.title}
                      description={p.description}
                      selected={field.value?.includes(p.value)}
                      onToggle={() => {
                        if (field.value?.includes(p.value)) {
                          field.onChange(
                            field.value.filter((v: string) => v !== p.value),
                          );
                        } else {
                          field.onChange([...(field.value || []), p.value]);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            />
          )}
        </div>
        {brandNames.length > 1 && (
          <Label className="text-xs font-medium w-full flex flex-col gap-1">
            Brand
            <p className="text-muted-foreground font-normal text-[11px]">
              Which brand to show on the DIMO button. Leave as &quot;Default&quot; to use
              your workspace default brand.
            </p>
            <SelectField
              {...register('brandName', { required: false })}
              options={[
                { value: '', text: 'Default' },
                ...brandNames.map((name) => ({ value: name, text: name })),
              ]}
              control={control}
              placeholder="Default"
              role="brandName-select"
            />
          </Label>
        )}
      </div>

      {/* Terms of Service */}
      <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
          Terms of Service
        </p>
        <Label className="text-xs font-medium flex flex-col gap-1">
          ToS URL
          <TextField
            type="url"
            placeholder="https://yourapp.com/terms"
            {...register('tosUrl', { required: false })}
            role="tos-url-input"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Displayed to vehicle owners before they grant permissions. Leave blank to
            skip.
          </p>
        </Label>
      </div>
    </>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint -- --quiet
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/license/\[tokenId\]/configurator/components/ConfigurationForm/ShareVehiclesWithDimoConfiguration.tsx
git commit -m "feat(configurator): wrap Share Vehicles in section cards, add ToS URL field"
```

---

### Task 4: Redesign the new ConfigurationForm (split panel + section cards + OutputPrint)

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/components/ConfigurationForm/ConfigurationForm.tsx`

- [ ] **Step 1: Replace the entire file**

```tsx
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
```

- [ ] **Step 2: Run lint**

```bash
npm run lint -- --quiet
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/license/\[tokenId\]/configurator/components/ConfigurationForm/ConfigurationForm.tsx
git commit -m "feat(configurator): redesign new config form — split panel, section cards, live preview"
```

---

### Task 5: Update new View.tsx — pass `licenseSummary` and wire `tosUrl`

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/new/components/View/View.tsx`

- [ ] **Step 1: Add `tosUrl` to `buildJson`**

In the `buildJson` function, add after `add('utm', values.utm)`:

```tsx
add('tosUrl', values.tosUrl);
```

Full updated `buildJson`:

```tsx
const buildJson = (values: DynamicFormProps): Record<string, unknown> => {
  const params: Record<string, unknown> = {};
  const add = (key: string, val: unknown) => {
    if (val === undefined || val === null || val === '') return;
    if (Array.isArray(val)) {
      if (val.length === 0) return;
      params[key] = val.join(',');
    } else if (typeof val === 'object') {
      params[key] = JSON.stringify(val);
    } else {
      params[key] = String(val);
    }
  };

  add('redirectUri', values.redirectUri);
  add('entryState', formatComponent(values.component));
  add('utm', values.utm);
  add('tosUrl', values.tosUrl);
  add(
    'expirationDate',
    values.expirationDate ? formatDate(new Date(values.expirationDate)) : undefined,
  );

  if (values.component === 'LoginWithDimo') {
    add('vehicles', parseArray(values.vehicles));
    add('vehicleMakes', parseArray(values.vehicleMakes));
    add('powerTrainTypes', parseArray(values.powerTrainTypes));
    add('brandName', values.brandName);
  }

  if (values.component === 'ShareVehiclesWithDimo') {
    add('brandName', values.brandName);
    if (values.permissionsMode === 'template') {
      add('permissionTemplateId', values.permissionTemplateId);
    } else if (values.permissionsMode === 'custom') {
      const permissionValues = PERMISSIONS.map((p) => {
        const k = values.permissions?.find((vp) => vp === p.key);
        if (k) return '1';
        return '0';
      });
      add('permissions', permissionValues?.join(''));
    }
  }

  if (values.component === 'ExecuteAdvancedTransactionWithDimo') {
    add('value', values.value);
    add('abi', tryParseJSON(values.abi as string));
    add('functionName', values.functionName);
    add('args', parseArray(values.args as string));
  }

  return params;
};
```

- [ ] **Step 2: Pass `licenseSummary` to ConfigurationForm**

Update the JSX render block:

```tsx
{
  data?.developerLicense && (
    <FormProvider {...methods}>
      <ConfigurationForm
        license={data?.developerLicense}
        licenseSummary={data?.developerLicense}
        submit={submit}
      />
    </FormProvider>
  );
}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint -- --quiet
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/license/\[tokenId\]/configurator/new/components/View/View.tsx
git commit -m "feat(configurator): wire tosUrl in new config buildJson, pass licenseSummary"
```

---

### Task 6: Redesign the edit ConfigurationForm (split panel + section cards + OutputPrint)

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/ConfigurationForm.tsx`

The edit form differs from the new form: Section 1 also shows **Configuration ID** (read-only) with a **Copy Link** button, and the submit button says **Update**.

- [ ] **Step 1: Replace the entire file**

```tsx
import { FC, useEffect, useState } from 'react';
import { FragmentType, useFragment } from '@/gql';
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
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
            Basics
          </p>
          <Label className="text-xs font-medium flex flex-col gap-1">
            Configuration ID
            <div className="flex gap-2 items-center">
              <TextField
                type="text"
                readOnly
                {...register('configuration_id', { required: false })}
                role="company-website-input"
              />
              <button
                type="button"
                onClick={handleCopyConfigurationLink}
                className="shrink-0 px-3 py-2 text-xs border border-border rounded-md hover:border-primary/50 hover:text-primary transition-colors whitespace-nowrap"
              >
                Copy Link
              </button>
            </div>
          </Label>
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
          Update
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
          Copy the{' '}
          <code className="bg-primary/10 px-1 rounded text-[10px]">
            configurationId
          </code>{' '}
          or the generated snippet to use in your app.
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Run lint**

```bash
npm run lint -- --quiet
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/license/\[tokenId\]/configurator/\[id\]/components/ConfigurationForm/ConfigurationForm.tsx
git commit -m "feat(configurator): redesign edit config form — split panel, section cards, live preview"
```

---

### Task 7: Update edit View.tsx — pass `licenseSummary` and wire `tosUrl`

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/[id]/components/View/View.tsx`

- [ ] **Step 1: Add `tosUrl` to `buildJson`**

Add after `add('utm', values.utm)`:

```tsx
add('tosUrl', values.tosUrl);
```

Full updated `buildJson`:

```tsx
const buildJson = (values: DynamicFormProps): Record<string, unknown> => {
  const params: Record<string, unknown> = {};
  const add = (key: string, val: unknown) => {
    if (val === undefined || val === null || val === '') return;
    if (Array.isArray(val)) {
      if (val.length === 0) return;
      params[key] = val.join(',');
    } else if (typeof val === 'object') {
      params[key] = JSON.stringify(val);
    } else {
      params[key] = String(val);
    }
  };

  add('redirectUri', values.redirectUri);
  add('entryState', formatComponent(values.component));
  add('utm', values.utm);
  add('tosUrl', values.tosUrl);
  add(
    'expirationDate',
    values.expirationDate ? formatDate(new Date(values.expirationDate)) : undefined,
  );

  if (values.component === 'LoginWithDimo') {
    add('vehicles', parseArray(values.vehicles));
    add('vehicleMakes', parseArray(values.vehicleMakes));
    add('powerTrainTypes', parseArray(values.powerTrainTypes));
    add('brandName', values.brandName);
  }

  if (values.component === 'ShareVehiclesWithDimo') {
    add('brandName', values.brandName);
    if (values.permissionsMode === 'template') {
      add('permissionTemplateId', values.permissionTemplateId);
    } else if (values.permissionsMode === 'custom') {
      const permissionValues = formatPermissions(values.permissions);
      add('permissions', permissionValues?.join(''));
    }
    if (values.requireAttestation) {
      const cloudEvent = {
        eventType: 'dimo.attestation',
        source: '*',
        ids: ['*'],
        tags: values.attestation.tags,
      };
      add('cloudEvent', cloudEvent);
    }
  }

  if (values.component === 'ExecuteAdvancedTransactionWithDimo') {
    add('value', values.value);
    add('abi', tryParseJSON(values.abi as string));
    add('functionName', values.functionName);
    add('args', parseArray(values.args as string));
  }

  return params;
};
```

- [ ] **Step 2: Pass `licenseSummary` to ConfigurationForm**

```tsx
{
  data?.developerLicense && (
    <FormProvider {...methods}>
      <ConfigurationForm
        license={data?.developerLicense}
        licenseSummary={data?.developerLicense}
        submit={submit}
      />
    </FormProvider>
  );
}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint -- --quiet
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/license/\[tokenId\]/configurator/\[id\]/components/View/View.tsx
git commit -m "feat(configurator): wire tosUrl in edit config buildJson, pass licenseSummary"
```

---

### Task 8: Update CSS wrappers

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/components/View/View.css`
- Modify: `src/app/license/[tokenId]/configurator/[id]/components/View/View.css`

The split-panel layout lives inside `ConfigurationForm`. The page wrapper only needs sensible vertical spacing.

- [ ] **Step 1: Update both View.css files to**

```css
.liwd-configurator-page {
  @apply flex flex-col gap-6;
}
```

- [ ] **Step 2: Commit**

```bash
git add \
  src/app/license/\[tokenId\]/configurator/components/View/View.css \
  src/app/license/\[tokenId\]/configurator/\[id\]/components/View/View.css
git commit -m "style(configurator): tighten page wrapper gap for redesigned layout"
```
