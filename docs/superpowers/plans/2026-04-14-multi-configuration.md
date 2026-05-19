# Multi-Configuration Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow one developer license to have multiple saved configurator configurations, replacing the 1:1 constraint with a list page → create/edit flow.

**Architecture:** `/configurator` becomes a list page; `/configurator/new` is the create form (moved from the current `/configurator`); `/configurator/[id]` (edit) is unchanged in behavior. Shared form components are consolidated under `configurator/components/ConfigurationForm/` and the `[id]` directory imports from there. The backend prerequisite (see Task 0) must be complete before tasks that fetch the list or call delete.

**Tech Stack:** Next.js App Router, TypeScript, React Hook Form, Apollo Client, Jest + React Testing Library

---

## Prerequisites

**Task 0 (backend, separate repo `dimo-developer-console-api`):**

1. `GET /api/my/configurations?clientId=...` must return `{ id, configuration_name, entry_state }[]` — an array, not a single object. `entry_state` is the existing value already stored on the configuration (e.g. `EMAIL_INPUT`, `VEHICLE_MANAGER`, `ADVANCED_TRANSACTION`).
2. `DELETE /api/my/configurations/:id` must be added, scoped to the authenticated user.

These tasks are written assuming the backend is done. Front-end tasks can be implemented and merged in any order, but the list page will show an empty state until the backend is live.

---

## File Map

| File                                                                                                                          | Action | Purpose                                              |
| ----------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| `src/actions/configurations.ts`                                                                                               | Modify | Rename list action, add delete action                |
| `src/app/license/[tokenId]/configurator/components/ConfigurationForm/types.ts`                                                | Modify | Add `configuration_id` to `SharedProps`              |
| `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/ConfigurationForm.tsx`                              | Modify | Import types + sub-components from shared location   |
| `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/types.ts`                                           | Delete | Replaced by shared types.ts                          |
| `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/LoginWithDimoConfiguration.tsx`                     | Delete | Replaced by shared component                         |
| `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/ShareVehiclesWithDimoConfiguration.tsx`             | Delete | Replaced by shared component                         |
| `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/ExecuteAdvanceTransactionWithDimoConfiguration.tsx` | Delete | Replaced by shared component                         |
| `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/index.ts`                                           | Modify | Remove re-exports that now live in shared location   |
| `src/app/license/[tokenId]/configurator/[id]/components/View/View.tsx`                                                        | Modify | Import types from shared location                    |
| `src/app/license/[tokenId]/configurator/components/ConfigurationList/ConfigurationList.tsx`                                   | Create | New list UI component                                |
| `src/app/license/[tokenId]/configurator/components/ConfigurationList/index.ts`                                                | Create | Barrel export                                        |
| `src/app/license/[tokenId]/configurator/components/View/View.tsx`                                                             | Delete | Moved to `/new` route                                |
| `src/app/license/[tokenId]/configurator/components/View/index.ts`                                                             | Delete | No longer needed                                     |
| `src/app/license/[tokenId]/configurator/page.tsx`                                                                             | Modify | Becomes list page                                    |
| `src/app/license/[tokenId]/configurator/new/page.tsx`                                                                         | Create | Create configuration page                            |
| `src/app/license/[tokenId]/configurator/new/components/View/View.tsx`                                                         | Create | Create configuration view (moved + redirect changed) |
| `src/app/license/[tokenId]/configurator/new/components/View/index.ts`                                                         | Create | Barrel export                                        |
| `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.tsx`                                                          | Modify | Remove configurationId fetch, simplify button        |
| `__tests__/unit/configurator/ConfigurationList.test.tsx`                                                                      | Create | Tests for list component                             |

---

## Task 1: Update `src/actions/configurations.ts`

**Files:**

- Modify: `src/actions/configurations.ts`

- [ ] **Step 1: Replace the file contents**

```typescript
'use server';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export interface IConfiguration {
  id: string;
  configuration_name: string;
  configuration: Record<string, unknown>;
}

export interface IConfigurationListItem {
  id: string;
  configuration_name: string;
  entry_state: string;
}

export const getConfigurationsByClientId = async ({
  client_id,
}: {
  client_id: string;
}): Promise<IConfigurationListItem[]> => {
  try {
    const client = await dimoDevAPIClient();
    const { data } = await client.get<IConfigurationListItem[]>(
      `/api/my/configurations?clientId=${client_id}`,
    );
    return data;
  } catch {
    return [];
  }
};

export const getConfiguration = async ({
  id,
}: {
  id: string;
}): Promise<IConfiguration> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<{ configuration: IConfiguration }>(
    `/api/my/configurations/${id}`,
  );
  return data.configuration;
};

export const saveConfiguration = async ({
  client_id,
  configuration_name,
  configuration,
}: {
  client_id: string;
  configuration_name: string;
  configuration: Record<string, unknown>;
}): Promise<{ id: string }> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post(`/api/my/configurations`, {
    client_id,
    configuration_name,
    configuration,
  });

  return { id: data.id };
};

export const updateConfiguration = async ({
  id,
  client_id,
  configuration_name,
  configuration,
}: {
  id: string;
  client_id: string;
  configuration_name: string;
  configuration: Record<string, unknown>;
}) => {
  const client = await dimoDevAPIClient();
  await client.put(`/api/my/configurations/${id}`, {
    client_id,
    configuration_name,
    configuration,
  });
};

export const deleteConfiguration = async ({ id }: { id: string }) => {
  const client = await dimoDevAPIClient();
  await client.delete(`/api/my/configurations/${id}`);
};
```

- [ ] **Step 2: Run TypeScript check to catch any reference to the old `getConfigurationByClientId`**

```bash
npm run compile 2>&1 | grep -i "getConfigurationByClientId\|configurations"
```

Expected: errors pointing to any remaining callers of the old name (will fix in Task 5 for Vehicles.tsx).

- [ ] **Step 3: Commit**

```bash
git add src/actions/configurations.ts
git commit -m "feat: rename getConfigurationsByClientId to return array, add deleteConfiguration"
```

---

## Task 2: Consolidate shared form types

The `[id]` `types.ts` has `configuration_id` in `SharedProps`; the shared one at `configurator/components/ConfigurationForm/types.ts` does not. We add `configuration_id` to the shared file so both the create form (where it will be empty/unused) and edit form use the same type.

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/components/ConfigurationForm/types.ts`

- [ ] **Step 1: Add `configuration_id` to `SharedProps`**

Open `src/app/license/[tokenId]/configurator/components/ConfigurationForm/types.ts`. Change:

```typescript
interface SharedProps {
  client_id: string;
  configuration_name: string;
  redirectUri: string;
```

To:

```typescript
interface SharedProps {
  client_id: string;
  configuration_name: string;
  configuration_id: string;
  redirectUri: string;
```

The rest of the file is unchanged.

- [ ] **Step 2: Run TypeScript check**

```bash
npm run compile 2>&1 | grep -i "types\|SharedProps"
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/license/[tokenId]/configurator/components/ConfigurationForm/types.ts
git commit -m "feat: add configuration_id to shared configurator types"
```

---

## Task 3: Update `[id]` ConfigurationForm to import from shared components

The `[id]/components/ConfigurationForm/ConfigurationForm.tsx` currently imports its sub-components (LoginWithDimoConfiguration, ShareVehiclesWithDimoConfiguration, etc.) and types from its own local directory. We point these at the shared `configurator/components/ConfigurationForm/` location and then delete the redundant local copies.

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/ConfigurationForm.tsx`
- Delete: `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/types.ts`
- Delete: `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/LoginWithDimoConfiguration.tsx`
- Delete: `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/ShareVehiclesWithDimoConfiguration.tsx`
- Delete: `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/ExecuteAdvanceTransactionWithDimoConfiguration.tsx`
- Modify: `src/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/index.ts`
- Modify: `src/app/license/[tokenId]/configurator/[id]/components/View/View.tsx`

- [ ] **Step 1: Rewrite `[id]/components/ConfigurationForm/ConfigurationForm.tsx`**

Replace the file with these updated imports (all other logic stays identical):

```typescript
import { FC, useContext } from 'react';
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

interface Props {
  license: FragmentType<typeof USER_CONFIG_FRAGMENT>;
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
  const fragment = useFragment(USER_CONFIG_FRAGMENT, license);
  const { setNotification } = useContext(NotificationContext);

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
        <Button type="submit" className="primary">
          Update
        </Button>
      </form>
    </>
  );
};
```

- [ ] **Step 2: Delete the now-redundant local copies**

```bash
rm src/app/license/\[tokenId\]/configurator/\[id\]/components/ConfigurationForm/types.ts
rm src/app/license/\[tokenId\]/configurator/\[id\]/components/ConfigurationForm/LoginWithDimoConfiguration.tsx
rm src/app/license/\[tokenId\]/configurator/\[id\]/components/ConfigurationForm/ShareVehiclesWithDimoConfiguration.tsx
rm src/app/license/\[tokenId\]/configurator/\[id\]/components/ConfigurationForm/ExecuteAdvanceTransactionWithDimoConfiguration.tsx
```

- [ ] **Step 3: Update `[id]/components/ConfigurationForm/index.ts` to only re-export `ConfigurationForm`**

Read the file first, then replace with:

```typescript
export { ConfigurationForm } from './ConfigurationForm';
```

- [ ] **Step 4: Update `[id]/components/View/View.tsx` — fix the types import**

In `src/app/license/[tokenId]/configurator/[id]/components/View/View.tsx`, find:

```typescript
import {
  ComponentType,
  DynamicFormProps,
  PERMISSIONS,
} from '@/app/license/[tokenId]/configurator/[id]/components/ConfigurationForm/types';
```

Replace with:

```typescript
import {
  ComponentType,
  DynamicFormProps,
  PERMISSIONS,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
```

- [ ] **Step 5: Run TypeScript check and fix any remaining import errors**

```bash
npm run compile 2>&1 | head -40
```

Expected: no errors. If there are import errors pointing to the deleted files, trace each and update the import path.

- [ ] **Step 6: Run tests**

```bash
npm test -- --passWithNoTests
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: consolidate [id] configurator form components to shared location"
```

---

## Task 4: Build the `ConfigurationList` component

**Files:**

- Create: `src/app/license/[tokenId]/configurator/components/ConfigurationList/ConfigurationList.tsx`
- Create: `src/app/license/[tokenId]/configurator/components/ConfigurationList/index.ts`
- Create: `__tests__/unit/configurator/ConfigurationList.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `__tests__/unit/configurator/ConfigurationList.test.tsx`:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigurationList } from '@/app/license/[tokenId]/configurator/components/ConfigurationList';
import * as configurationsActions from '@/actions/configurations';

jest.mock('@/actions/configurations', () => ({
  getConfigurationsByClientId: jest.fn(),
  deleteConfiguration: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const mockConfigs = [
  { id: 'abc123', configuration_name: 'My Config', entry_state: 'VEHICLE_MANAGER' },
  { id: 'def456', configuration_name: 'Another Config', entry_state: 'EMAIL_INPUT' },
];

describe('ConfigurationList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (configurationsActions.getConfigurationsByClientId as jest.Mock).mockResolvedValue(
      mockConfigs,
    );
  });

  it('renders a list of configurations', async () => {
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);

    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
      expect(screen.getByText('Another Config')).toBeInTheDocument();
    });
  });

  it('renders empty state when no configurations exist', async () => {
    (configurationsActions.getConfigurationsByClientId as jest.Mock).mockResolvedValue([]);

    render(<ConfigurationList clientId="0xabc" tokenId={42} />);

    await waitFor(() => {
      expect(
        screen.getByText(/no configurations yet/i),
      ).toBeInTheDocument();
    });
  });

  it('shows confirm UI when delete is clicked', async () => {
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);

    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByRole('button', { name: /confirm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('calls deleteConfiguration and refreshes on confirm', async () => {
    (configurationsActions.deleteConfiguration as jest.Mock).mockResolvedValue(undefined);
    (configurationsActions.getConfigurationsByClientId as jest.Mock)
      .mockResolvedValueOnce(mockConfigs)
      .mockResolvedValueOnce([mockConfigs[1]]);

    render(<ConfigurationList clientId="0xabc" tokenId={42} />);

    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(configurationsActions.deleteConfiguration).toHaveBeenCalledWith({
        id: 'abc123',
      });
    });
  });

  it('cancels delete when cancel is clicked', async () => {
    render(<ConfigurationList clientId="0xabc" tokenId={42} />);

    await waitFor(() => {
      expect(screen.getByText('My Config')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(screen.queryByRole('button', { name: /confirm/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm test -- --testPathPattern="ConfigurationList" --passWithNoTests
```

Expected: FAIL — `Cannot find module '@/app/license/[tokenId]/configurator/components/ConfigurationList'`

- [ ] **Step 3: Create the `ConfigurationList` component**

Create `src/app/license/[tokenId]/configurator/components/ConfigurationList/ConfigurationList.tsx`:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  getConfigurationsByClientId,
  deleteConfiguration,
  IConfigurationListItem,
} from '@/actions/configurations';
import { Button } from '@/components/Button';

interface Props {
  clientId: string;
  tokenId: number;
}

const entryStateLabel = (entryState: string): string => {
  switch (entryState) {
    case 'EMAIL_INPUT':
      return 'Login With DIMO';
    case 'VEHICLE_MANAGER':
      return 'Share Vehicles With DIMO';
    case 'ADVANCED_TRANSACTION':
      return 'Execute Advanced Transaction';
    default:
      return entryState;
  }
};

export const ConfigurationList = ({ clientId, tokenId }: Props) => {
  const router = useRouter();
  const [configs, setConfigs] = useState<IConfigurationListItem[]>([]);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = async () => {
    const data = await getConfigurationsByClientId({ client_id: clientId });
    setConfigs(data);
  };

  useEffect(() => {
    void load();
  }, [clientId]);

  const handleDelete = async (id: string) => {
    await deleteConfiguration({ id });
    setPendingDeleteId(null);
    await load();
  };

  if (configs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-text-secondary">
        <p className="mb-4">No configurations yet.</p>
        <Button
          className="primary"
          onClick={() => router.push(`/license/${tokenId}/configurator/new`)}
        >
          Create your first configuration
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-surface-default text-left text-text-secondary">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Component</th>
            <th className="py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((config) => (
            <tr key={config.id} className="border-b border-surface-default">
              <td className="py-3 pr-4">{config.configuration_name || '(untitled)'}</td>
              <td className="py-3 pr-4 text-text-secondary">
                {entryStateLabel(config.entry_state)}
              </td>
              <td className="py-3">
                {pendingDeleteId === config.id ? (
                  <div className="flex gap-2">
                    <Button
                      className="table-action-button"
                      onClick={() => void handleDelete(config.id)}
                    >
                      Confirm
                    </Button>
                    <Button
                      className="table-action-button"
                      onClick={() => setPendingDeleteId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      className="table-action-button"
                      onClick={() =>
                        router.push(`/license/${tokenId}/configurator/${config.id}`)
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      className="table-action-button"
                      onClick={() => setPendingDeleteId(config.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

- [ ] **Step 4: Create the barrel export**

Create `src/app/license/[tokenId]/configurator/components/ConfigurationList/index.ts`:

```typescript
export { ConfigurationList } from './ConfigurationList';
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
npm test -- --testPathPattern="ConfigurationList"
```

Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/license/\[tokenId\]/configurator/components/ConfigurationList/ __tests__/unit/configurator/
git commit -m "feat: add ConfigurationList component with edit/delete per row"
```

---

## Task 5: Replace `configurator/page.tsx` with the list page

The current `configurator/page.tsx` renders the create form. We replace it with a list page view that wraps `ConfigurationList`.

**Files:**

- Modify: `src/app/license/[tokenId]/configurator/page.tsx`
- Create: `src/app/license/[tokenId]/configurator/components/ListView/ListView.tsx`
- Create: `src/app/license/[tokenId]/configurator/components/ListView/index.ts`
- Delete: `src/app/license/[tokenId]/configurator/components/View/View.tsx`
- Delete: `src/app/license/[tokenId]/configurator/components/View/index.ts`

- [ ] **Step 1: Create the list page view component**

Create `src/app/license/[tokenId]/configurator/components/ListView/ListView.tsx`:

```typescript
'use client';

import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';
import { useEffect, useState } from 'react';
import { PageSubtitle } from '@/components/PageSubtitle';
import { ConfigurationList } from '@/app/license/[tokenId]/configurator/components/ConfigurationList';
import { DEVELOPER_LICENSE_INFO } from '@/app/license/[tokenId]/configurator/components/View/View';
import { useFragment } from '@/gql';
import { USER_CONFIG_FRAGMENT } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';

export const ListView = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const [tokenId, setTokenId] = useState<number>();
  const router = useRouter();

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    void getTokenId();
  }, [params]);

  const { data, loading, error } = useQuery(DEVELOPER_LICENSE_INFO, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });

  const fragment = useFragment(USER_CONFIG_FRAGMENT, data?.developerLicense ?? null);

  if (loading) {
    return (
      <div className="license-details-page">
        <Loader isLoading={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="license-details-page">
        <p>There was an error fetching the license details</p>
      </div>
    );
  }

  return (
    <div className="liwd-configurator-page">
      <div className="flex items-center justify-between mb-4">
        <PageSubtitle subtitle="Login With DIMO Configurator" />
        <Button
          className="dark with-icon px-4"
          onClick={() => router.push(`/license/${tokenId}/configurator/new`)}
        >
          New Configuration
        </Button>
      </div>
      <p className="text-sm text-text-secondary mb-4">
        A vehicle sharing link is required for vehicle owners to grant data permissions to
        your application.{' '}
        <a
          href="https://www.dimo.org/docs/build/building-with-tools/client-sdk-dimo-connect"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Learn how to use the configurationId with LIWD
        </a>
      </p>
      {fragment?.clientId && tokenId && (
        <ConfigurationList clientId={fragment.clientId} tokenId={tokenId} />
      )}
    </div>
  );
};

export default ListView;
```

- [ ] **Step 2: Create the barrel export**

Create `src/app/license/[tokenId]/configurator/components/ListView/index.ts`:

```typescript
export { ListView } from './ListView';
```

- [ ] **Step 3: Update `configurator/page.tsx`**

Replace the contents of `src/app/license/[tokenId]/configurator/page.tsx`:

```typescript
import { Metadata } from 'next';
import { ListView } from './components/ListView';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Settings | ${configuration.appName}`,
};

const ConfiguratorListPage = ListView;
export default ConfiguratorListPage;
```

- [ ] **Step 4: Delete the old create View files**

```bash
rm src/app/license/\[tokenId\]/configurator/components/View/View.tsx
rm src/app/license/\[tokenId\]/configurator/components/View/index.ts
```

- [ ] **Step 5: Run TypeScript check**

```bash
npm run compile 2>&1 | head -40
```

Expected: no errors. If `ListView.tsx` still references `DEVELOPER_LICENSE_INFO` from the deleted View, move the export. See note below.

> **Note:** `DEVELOPER_LICENSE_INFO` is currently exported from `configurator/components/View/View.tsx` and imported by the `[id]` View. After deleting that file, move the `DEVELOPER_LICENSE_INFO` constant to a new shared file or into the new `ListView.tsx`. Update `[id]/components/View/View.tsx` to import it from `ListView` or a shared module.

If the compiler reports a missing `DEVELOPER_LICENSE_INFO`:

1. In `ListView.tsx`, the `DEVELOPER_LICENSE_INFO` import comes from the now-deleted path. Move the gql query definition directly into `ListView.tsx` and export it:

```typescript
import { gql } from '@/gql';

export const DEVELOPER_LICENSE_INFO = gql(`
  query DeveloperLicenseInfo($tokenId: Int!) {
    developerLicense(by: {tokenId: $tokenId}) {
      ...DeveloperLicenseSummaryFragment   
      ...SignerFragment
      ...RedirectUriFragment
      ...DeveloperLicenseVehiclesFragment
      ...DeveloperJwtsFragment
      ...UserConfigurationFragment
    }
  }
`);
```

2. Update `[id]/components/View/View.tsx` to import from the new location:

```typescript
import { DEVELOPER_LICENSE_INFO } from '@/app/license/[tokenId]/configurator/components/ListView/ListView';
```

- [ ] **Step 6: Run tests**

```bash
npm test -- --passWithNoTests
```

Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: replace /configurator root with configurations list page"
```

---

## Task 6: Create the `/new` (create) route

**Files:**

- Create: `src/app/license/[tokenId]/configurator/new/page.tsx`
- Create: `src/app/license/[tokenId]/configurator/new/components/View/View.tsx`
- Create: `src/app/license/[tokenId]/configurator/new/components/View/index.ts`

- [ ] **Step 1: Create the create View**

Create `src/app/license/[tokenId]/configurator/new/components/View/View.tsx`.

This is the existing create View with one change: `router.replace` now goes to the list page instead of the edit page.

```typescript
'use client';

import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';
import { useEffect, useState, useContext } from 'react';
import { PageSubtitle } from '@/components/PageSubtitle';
import { ConfigurationForm } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm';
import { FormProvider, useForm } from 'react-hook-form';
import {
  ComponentType,
  DynamicFormProps,
  PERMISSIONS,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';
import { saveConfiguration } from '@/actions/configurations';
import { useRouter } from 'next/navigation';
import { DEVELOPER_LICENSE_INFO } from '@/app/license/[tokenId]/configurator/components/ListView/ListView';
import { NotificationContext } from '@/context/notificationContext';

const parseArray = (val?: string) =>
  val
    ?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const tryParseJSON = (val?: string) => {
  try {
    return val ? JSON.parse(val) : {};
  } catch {
    return {};
  }
};

const formatComponent = (component: ComponentType) => {
  switch (component) {
    case 'LoginWithDimo':
      return 'EMAIL_INPUT';
    case 'ShareVehiclesWithDimo':
      return 'VEHICLE_MANAGER';
    case 'ExecuteAdvancedTransactionWithDimo':
      return 'ADVANCED_TRANSACTION';
  }
};

function formatDate(date?: Date) {
  if (!date) return '';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${yyyy}`;
}

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
  add(
    'expirationDate',
    values.expirationDate ? formatDate(new Date(values.expirationDate)) : undefined,
  );

  if (values.component === 'LoginWithDimo') {
    add('vehicles', parseArray(values.vehicles));
    add('vehicleMakes', parseArray(values.vehicleMakes));
    add('powerTrainTypes', parseArray(values.powerTrainTypes));
  }

  if (values.component === 'ShareVehiclesWithDimo') {
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

export const View = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const [tokenId, setTokenId] = useState<number>();
  const { data, loading, error } = useQuery(DEVELOPER_LICENSE_INFO, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });
  const router = useRouter();
  const { setNotification } = useContext(NotificationContext);

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    void getTokenId();
  }, [params]);

  const methods = useForm<DynamicFormProps>({
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      component: 'ShareVehiclesWithDimo',
    },
  });

  const submit = async (data: DynamicFormProps) => {
    try {
      const body = {
        client_id: data.client_id,
        configuration_name: data.configuration_name,
        configuration: buildJson(data),
      };

      await saveConfiguration(body);

      setNotification('Configuration successfully created', '', 'success');

      // Redirect to the list, not to the edit page
      router.replace(`/license/${tokenId}/configurator`);
    } catch (error) {
      console.log(error);
      setNotification('Failed to create Configuration. Please try again.', '', 'error');
    }
  };

  if (loading) {
    return (
      <div className="license-details-page">
        <Loader isLoading={true} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="license-details-page">
        <p>There was an error fetching the license details</p>
      </div>
    );
  }

  return (
    <div className="liwd-configurator-page">
      <PageSubtitle subtitle="Login With DIMO Configurator" />
      <p className="text-sm text-text-secondary mb-4">
        A vehicle sharing link is required for vehicle owners to grant data permissions to
        your application.{' '}
        <a
          href="https://www.dimo.org/docs/build/building-with-tools/client-sdk-dimo-connect"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          Learn how to use the configurationId with LIWD
        </a>
      </p>
      {data?.developerLicense && (
        <FormProvider {...methods}>
          <ConfigurationForm license={data?.developerLicense} submit={submit} />
        </FormProvider>
      )}
    </div>
  );
};

export default View;
```

- [ ] **Step 2: Create the barrel export**

Create `src/app/license/[tokenId]/configurator/new/components/View/index.ts`:

```typescript
export { View } from './View';
```

- [ ] **Step 3: Create the page**

Create `src/app/license/[tokenId]/configurator/new/page.tsx`:

```typescript
import { Metadata } from 'next';
import { View } from './components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Settings | ${configuration.appName}`,
};

const NewConfiguratorPage = View;
export default NewConfiguratorPage;
```

- [ ] **Step 4: Run TypeScript check**

```bash
npm run compile 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
npm test -- --passWithNoTests
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/license/\[tokenId\]/configurator/new/
git commit -m "feat: add /configurator/new create route, redirect to list on save"
```

---

## Task 7: Simplify `Vehicles.tsx` entry point

**Files:**

- Modify: `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.tsx`

- [ ] **Step 1: Remove the configurationId state and fetch, simplify the button**

In `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.tsx`:

Remove these imports:

```typescript
import { useState } from 'react'; // remove if no other useState usage
import { getConfigurationByClientId } from '@/actions/configurations'; // remove
```

Remove these lines from the `Vehicles` component:

```typescript
const [configurationId, setConfigurationId] = useState<string>('');

useEffect(() => {
  if (!fragment.clientId) return;

  const getConfigurationId = async (clientId: string) => {
    try {
      const { id } = await getConfigurationByClientId({ client_id: clientId });
      setConfigurationId(id);
    } catch {
      // configuration ID not found — "Configure Vehicle Sharing" button stays disabled
    }
  };

  void getConfigurationId(fragment.clientId);
}, [fragment.clientId]);
```

Change the button's `onClick` from:

```typescript
onClick={() => {
  router.push(
    configurationId
      ? `/license/${fragment.tokenId}/configurator/${configurationId}`
      : `/license/${fragment.tokenId}/configurator`,
  );
}}
```

To:

```typescript
onClick={() => {
  router.push(`/license/${fragment.tokenId}/configurator`);
}}
```

The final component body should look like:

```typescript
export const Vehicles: FC<IProps> = ({ license }) => {
  const fragment = useFragment(DEVELOPER_LICENSE_VEHICLES_FRAGMENT, license);
  const { data, loading, error } = useQuery(GET_VEHICLE_COUNT_BY_CLIENT_ID, {
    variables: { clientId: fragment.clientId },
  });
  const router = useRouter();

  return (
    <div className={'w-full'}>
      <Section>
        <SectionHeader title={'Vehicles'}>
          <div className={'flex flex-row gap-2'}>
            <VehicleSimulatorModal clientId={fragment.clientId as `0x${string}`} />
            <Button
              className="dark with-icon px-4"
              onClick={() => {
                router.push(`/license/${fragment.tokenId}/configurator`);
              }}
            >
              Configure Vehicle Sharing
            </Button>
          </div>
        </SectionHeader>
        <div className={'flex flex-col flex-1'}>
          {!!error && <p>We had trouble fetching the connected vehicles</p>}
          {loading && <Loader isLoading={true} />}
          {!!data && (
            <VehiclesTotalCount
              totalCount={data.vehicles.totalCount}
              clientId={fragment.clientId}
            />
          )}
        </div>
      </Section>
    </div>
  );
};
```

- [ ] **Step 2: Run TypeScript check**

```bash
npm run compile 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
npm test -- --passWithNoTests
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/license/\[tokenId\]/details/components/Vehicles/Vehicles.tsx
git commit -m "feat: simplify Vehicles entry point — always route to configurator list"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement                             | Covered by                                         |
| -------------------------------------------- | -------------------------------------------------- |
| Backend: list endpoint returns array         | Task 0 (backend prereq) + Task 1 (frontend action) |
| Backend: DELETE endpoint                     | Task 0 (backend prereq) + Task 1 (frontend action) |
| `getConfigurationsByClientId` returns array  | Task 1                                             |
| `deleteConfiguration` action                 | Task 1                                             |
| `/configurator` becomes list page            | Task 5                                             |
| `/configurator/new` creates configuration    | Task 6                                             |
| `/configurator/[id]` edit unchanged in logic | Task 3 (import consolidation only)                 |
| List page: New Configuration button          | Task 5                                             |
| List page: table with Name + Component type  | Task 4                                             |
| List page: Edit per row                      | Task 4                                             |
| List page: Delete with confirmation          | Task 4                                             |
| List page: empty state                       | Task 4                                             |
| Shared form components consolidated          | Task 2 + Task 3                                    |
| Create redirects to list on save             | Task 6                                             |
| Vehicles.tsx simplified                      | Task 7                                             |

All requirements covered. No gaps found.
