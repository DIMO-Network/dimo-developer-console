# License Details Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the instrument-cluster layout with a persistent header + 4-tab design (Overview, Config, Vehicles, Brand).

**Architecture:** Rewrite `View.tsx` as the composition layer with tab state. Simplify `Usage` and `Vehicles` by removing the `cluster` prop. Remove `CollapsibleSection` wrappers from `Signers`, `DeveloperJwts`, `RedirectUris`, and `Brand`, replacing with flat inline structure. Inline `Summary` logic directly into the View header and delete the `Summary` component folder.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, Apollo Client, React Testing Library, Jest

---

## File Map

| File                                                                           | Change                                                                  |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `src/app/license/[tokenId]/details/components/Usage/Usage.tsx`                 | Remove `cluster` prop + gauge-ring path; render stat card only          |
| `src/app/license/[tokenId]/details/components/Usage/Usage.css`                 | Remove `.consumed-credits-container`; add overview stat-card classes    |
| `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.tsx`           | Remove `cluster` prop + gauge-ring path; render stat + 3 action buttons |
| `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.css`           | Remove `.vehicle-count-container`; add vehicles-tab classes             |
| `src/app/license/[tokenId]/details/components/Signers/Signers.tsx`             | Remove `CollapsibleSection` wrapper → flat inline structure             |
| `src/app/license/[tokenId]/details/components/DeveloperJwts/DeveloperJwts.tsx` | Remove `CollapsibleSection` wrapper → flat inline structure             |
| `src/app/license/[tokenId]/details/components/RedirectUris/RedirectUris.tsx`   | Remove `CollapsibleSection` wrapper → flat inline structure             |
| `src/app/license/[tokenId]/details/components/Brand/Brand.tsx`                 | Remove `CollapsibleSection` wrapper → flat inline structure             |
| `__tests__/unit/pages/license/[tokenId]/details/Brand.test.tsx`                | Remove now-stale `CollapsibleSection` mock                              |
| `src/app/license/[tokenId]/details/components/View/View.tsx`                   | Full rewrite: tab state, persistent header, tab panels                  |
| `src/app/license/[tokenId]/details/components/View/View.css`                   | Full rewrite: header, tabs, overview, vehicles styles                   |
| `src/app/license/[tokenId]/details/components/Summary/`                        | Delete entire folder                                                    |

---

## Task 1: Simplify Usage component

Remove the `cluster` prop and the gauge-ring render path. The component now always renders a stat card.

**Files:**

- Modify: `src/app/license/[tokenId]/details/components/Usage/Usage.tsx`
- Modify: `src/app/license/[tokenId]/details/components/Usage/Usage.css`

- [ ] **Step 1: Replace Usage.tsx**

```tsx
import React, { FC, useEffect, useState } from 'react';
import { useCreditTracker, useEventEmitter } from '@/hooks';
import { FragmentType, useFragment } from '@/gql';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';
import Link from 'next/link';
import { AxiosError } from 'axios';
import { useGetDevJwts } from '@/hooks/useGetDevJwts';
import './Usage.css';

interface Props {
  license: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT>;
}

export const Usage: FC<Props> = ({ license }) => {
  const { getUsageByLicense } = useCreditTracker();
  const [credits, setCredits] = useState(0);
  const fragment = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, license);
  const { eventData } = useEventEmitter<unknown>('developer-jwt-updated');
  const { isAuthenticatedAsDev, devJwts, refetch } = useGetDevJwts(fragment?.clientId);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const { numOfCreditsUsed } = await getUsageByLicense({
          licenseId: fragment.clientId,
          devJwt: devJwts[0].token,
        });
        setCredits(numOfCreditsUsed);
      } catch (error: unknown) {
        if (error instanceof AxiosError) {
          console.error(error.response?.data.message || 'Error fetching usage');
        }
        console.error('Error fetching usage:', error);
      }
    };
    refetch();
    if (!isAuthenticatedAsDev) return;
    void fetchUsage();
  }, [fragment, isAuthenticatedAsDev, eventData]);

  return (
    <div className="overview-stat-card">
      <p className="overview-stat-card__number">{isAuthenticatedAsDev ? credits : '—'}</p>
      <p className="overview-stat-card__label">Credits Used</p>
      {!isAuthenticatedAsDev && (
        <p className="overview-stat-card__hint">Generate a JWT to see usage</p>
      )}
      <Link
        href="https://docs.dimo.org/developer-platform/developer-guide/dimo-credits"
        target="_blank"
        className="overview-stat-card__link"
      >
        Learn about credits →
      </Link>
    </div>
  );
};
```

- [ ] **Step 2: Replace Usage.css**

```css
.overview-stat-card {
  @apply bg-accent rounded-xl p-5 flex flex-col gap-1;
}

.overview-stat-card__number {
  @apply text-4xl font-bold text-foreground tabular-nums leading-none;
}

.overview-stat-card__label {
  @apply text-xs uppercase tracking-wide text-text-secondary mt-1;
}

.overview-stat-card__hint {
  @apply text-xs text-text-secondary;
}

.overview-stat-card__link {
  @apply text-xs text-text-secondary hover:text-foreground transition-colors mt-2 self-start;
}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/license/\[tokenId\]/details/components/Usage/
git commit -m "refactor: simplify Usage to stat card, remove cluster gauge path"
```

---

## Task 2: Simplify Vehicles component

Remove the `cluster` prop and gauge-ring path. The component now always renders a large stat + 3 action buttons. Export the query constant (needed by View.tsx for the Overview stat).

**Files:**

- Modify: `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.tsx`
- Modify: `src/app/license/[tokenId]/details/components/Vehicles/Vehicles.css`

- [ ] **Step 1: Replace Vehicles.tsx**

```tsx
'use client';
import React, { FC } from 'react';
import { FragmentType, gql, useFragment } from '@/gql';
import { useQuery } from '@apollo/client';
import { Loader } from '@/components/Loader';
import Link from 'next/link';
import { Button } from '@/components/Button';
import { useRouter } from 'next/navigation';
import { VehicleSimulatorModal } from '@/app/app/list/components/VehicleSimulator/VehicleSimulatorModal';
import './Vehicles.css';

export const DEVELOPER_LICENSE_VEHICLES_FRAGMENT = gql(`
  fragment DeveloperLicenseVehiclesFragment on DeveloperLicense {
    clientId
    tokenId
  }
`);

export const GET_VEHICLE_COUNT_BY_CLIENT_ID = gql(`
  query GetVehicleCountByClientId($clientId:Address!) {
    vehicles(first:0, filterBy:{privileged:$clientId}) {
      totalCount
    }
  }
`);

interface IProps {
  license: FragmentType<typeof DEVELOPER_LICENSE_VEHICLES_FRAGMENT>;
}

export const Vehicles: FC<IProps> = ({ license }) => {
  const fragment = useFragment(DEVELOPER_LICENSE_VEHICLES_FRAGMENT, license);
  const { data, loading, error } = useQuery(GET_VEHICLE_COUNT_BY_CLIENT_ID, {
    variables: { clientId: fragment.clientId },
  });
  const router = useRouter();

  return (
    <div className="flex flex-col gap-4">
      <div className="vehicles-stat">
        {loading && <Loader isLoading />}
        {!!error && <p className="text-sm text-text-secondary">Error loading vehicles</p>}
        {!!data && (
          <>
            <Link
              href={`/license/vehicles/${fragment.clientId}`}
              className="hover:opacity-80 transition-opacity"
            >
              <p className="vehicles-stat__number">{data.vehicles.totalCount}</p>
            </Link>
            <p className="vehicles-stat__label">Connected Vehicles</p>
            <Link
              href={`/license/vehicles/${fragment.clientId}`}
              className="vehicles-stat__link"
            >
              View vehicle list →
            </Link>
          </>
        )}
      </div>
      <div className="flex flex-row gap-3">
        <Link href={`/license/vehicles/${fragment.clientId}`} className="flex-1">
          <Button className="dark w-full">Vehicle List</Button>
        </Link>
        <div className="flex-1">
          <VehicleSimulatorModal clientId={fragment.clientId as `0x${string}`} />
        </div>
        <Button
          className="dark flex-1"
          onClick={() => router.push(`/license/${fragment.tokenId}/configurator`)}
        >
          Configure Sharing
        </Button>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Replace Vehicles.css**

```css
.vehicles-stat {
  @apply bg-accent rounded-xl p-8 flex flex-col items-center gap-1 text-center;
}

.vehicles-stat__number {
  @apply text-5xl font-bold text-foreground tabular-nums leading-none;
}

.vehicles-stat__label {
  @apply text-xs uppercase tracking-wide text-text-secondary mt-1;
}

.vehicles-stat__link {
  @apply text-xs text-text-secondary hover:text-foreground transition-colors mt-2;
}
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/license/\[tokenId\]/details/components/Vehicles/
git commit -m "refactor: simplify Vehicles to stat + actions, remove cluster gauge path"
```

---

## Task 3: Flatten Signers section

Remove the `CollapsibleSection` wrapper. Replace with an always-visible flat section — a header row (title + action buttons) above a content area.

**Files:**

- Modify: `src/app/license/[tokenId]/details/components/Signers/Signers.tsx`

- [ ] **Step 1: Edit the JSX return in `SignersComponent`**

Replace only the JSX `return (...)` block (lines 381–479 in the current file). All logic above the return stays exactly the same. The new return:

```tsx
return (
  <div className="p-4 bg-accent border border-border rounded-2xl flex flex-col gap-4 text-foreground">
    <div className="flex flex-col gap-2 md:gap-0 md:flex-row justify-between md:items-center">
      <h2 className="text-xl font-semibold text-foreground">API Keys</h2>
      {isLicenseOwner && (
        <div className="flex gap-2">
          <Button
            className="dark with-icon px-4"
            onClick={() => setShowRentalOSConfirm(true)}
          >
            <TruckIcon className="w-4 h-4" />
            Register RentalOS
          </Button>
          <Button className="dark with-icon px-4" onClick={handleGenerateSigner}>
            <KeyIcon className="w-4 h-4" />
            Generate Key
          </Button>
        </div>
      )}
    </div>
    <div>
      {!!displaySigners.length && (
        <Table
          columns={[
            {
              name: 'address',
              label: 'Signer address',
              CustomHeader: <SignerAddressHeader key="header-addr" />,
              render: (item: SignerNode) => (
                <div className="flex items-center gap-2">
                  <span>{item.address}</span>
                  {item.address.toLowerCase() === rentalOSSigner && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cta-default text-white whitespace-nowrap">
                      RentalOS
                    </span>
                  )}
                </div>
              ),
            },
            { name: 'enabledAt', label: 'Enabled on', render: renderEnabledAt },
          ]}
          data={displaySigners}
          actions={[renderDeleteSignerAction]}
        />
      )}
    </div>
    <DeleteConfirmationModal
      isOpen={!!signerToDelete}
      title={'Are you sure you want to delete this API key?'}
      subtitle={'You will no longer be able to use this key in your app.'}
      onConfirm={onConfirmDelete}
      onCancel={() => {
        setSignerToDelete(undefined);
      }}
      confirmButtonClassName={'error'}
    />
    <APIKeyModal
      isOpen={!!apiKey}
      apiKey={String(apiKey)?.replace('0x', '') ?? ''}
      onClose={() => setApiKey(undefined)}
    />
    <Modal isOpen={showRentalOSConfirm} setIsOpen={setShowRentalOSConfirm}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold">Register RentalOS</h2>
          <p className="text-text-secondary text-sm">
            Clicking <strong>Proceed</strong> will:
          </p>
          <ul className="text-text-secondary text-sm list-disc pl-5 flex flex-col gap-1">
            <li>Add RentalOS as an authorized redirect URI</li>
            <li>Generate and register a new API key</li>
            <li>Register your tenant with RentalOS</li>
          </ul>
          <p className="text-text-secondary text-sm">
            You&apos;ll need to approve transactions. Don&apos;t close this window once
            started.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            className="primary flex-1"
            onClick={() => {
              setShowRentalOSConfirm(false);
              void handleGenerateRentalOSTenant();
            }}
          >
            Proceed
          </Button>
          <Button
            className="primary-outline flex-1"
            onClick={() => setShowRentalOSConfirm(false)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  </div>
);
```

- [ ] **Step 2: Remove the `CollapsibleSection` import**

Delete this line from the imports at the top of `Signers.tsx`:

```tsx
import { CollapsibleSection } from '@/components/CollapsibleSection';
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/license/\[tokenId\]/details/components/Signers/
git commit -m "refactor: remove CollapsibleSection from Signers, render flat"
```

---

## Task 4: Flatten DeveloperJwts section

**Files:**

- Modify: `src/app/license/[tokenId]/details/components/DeveloperJwts/DeveloperJwts.tsx`

- [ ] **Step 1: Replace the JSX return block in `DeveloperJwts`**

The early-return `if (!isLicenseOwner) return null` stays. Replace only the final `return (...)`:

```tsx
return (
  <div className="p-4 bg-accent border border-border rounded-2xl flex flex-col gap-4 text-foreground">
    <div className="flex flex-col gap-2 md:gap-0 md:flex-row justify-between md:items-center">
      <h2 className="text-xl font-semibold text-foreground">Developer JWTs</h2>
      <GenerateDevJWT
        clientId={fragment.clientId}
        domain={fragment.redirectURIs.nodes[0]?.uri ?? undefined}
        buttonText="Generate new JWT"
        onSuccess={handleGenerateSuccess}
      />
    </div>
    <div>
      {devJwts.length > 0 ? (
        <Table
          columns={columns}
          data={devJwts}
          actions={[renderCopyButton, renderDeleteButton]}
        />
      ) : (
        <p className="text-text-secondary">No developer JWTs found</p>
      )}
      <DeleteConfirmationModal
        isOpen={!!jwtToDelete}
        title="Are you sure you want to delete this JWT?"
        subtitle=""
        onConfirm={() => {
          if (jwtToDelete) {
            handleDelete(jwtToDelete);
            setJwtToDelete(undefined);
          }
        }}
        onCancel={() => setJwtToDelete(undefined)}
        confirmButtonClassName="error"
      />
    </div>
  </div>
);
```

- [ ] **Step 2: Remove the `CollapsibleSection` import**

Delete this line:

```tsx
import { CollapsibleSection } from '@/components/CollapsibleSection';
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/license/\[tokenId\]/details/components/DeveloperJwts/
git commit -m "refactor: remove CollapsibleSection from DeveloperJwts, render flat"
```

---

## Task 5: Flatten RedirectUris section

**Files:**

- Modify: `src/app/license/[tokenId]/details/components/RedirectUris/RedirectUris.tsx`

- [ ] **Step 1: Replace the JSX return block in `RedirectUris`**

```tsx
return (
  <div className="p-4 bg-accent border border-border rounded-2xl flex flex-col gap-4 text-foreground">
    <div className="flex flex-col gap-2 md:gap-0 md:flex-row justify-between md:items-center">
      <h2 className="text-xl font-semibold text-foreground">Authorized Redirect URIs</h2>
    </div>
    <div className="flex flex-col gap-4">
      {isLicenseOwner && (
        <div>
          <RedirectUriForm
            tokenId={fragment.tokenId}
            refreshData={refetch}
            redirectUris={displayUris}
            owner={fragment.owner}
            onAdded={handleAdded}
          />
        </div>
      )}
      {!!displayUris.length && (
        <RedirectUriList
          isOwner={isLicenseOwner}
          redirectUris={displayUris}
          refreshData={refetch}
          tokenId={fragment.tokenId}
          onRemoved={handleRemoved}
        />
      )}
    </div>
  </div>
);
```

- [ ] **Step 2: Remove the `CollapsibleSection` import**

Delete this line:

```tsx
import { CollapsibleSection } from '@/components/CollapsibleSection';
```

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/license/\[tokenId\]/details/components/RedirectUris/
git commit -m "refactor: remove CollapsibleSection from RedirectUris, render flat"
```

---

## Task 6: Flatten Brand section + clean up test

**Files:**

- Modify: `src/app/license/[tokenId]/details/components/Brand/Brand.tsx`
- Modify: `__tests__/unit/pages/license/[tokenId]/details/Brand.test.tsx`

- [ ] **Step 1: Replace the JSX return block in `Brand`**

Replace only the final `return (...)` block (the outer `CollapsibleSection` wrapper). All state/logic above it stays unchanged:

```tsx
return (
  <div className="p-4 bg-accent border border-border rounded-2xl flex flex-col gap-4 text-foreground">
    <div className="flex flex-col gap-2 md:gap-0 md:flex-row justify-between md:items-center">
      <h2 className="text-xl font-semibold text-foreground">Brand</h2>
      {isOwner && !editing && (
        <Button type="button" className="dark" onClick={() => setEditing('new')}>
          Add Brand
        </Button>
      )}
    </div>
    <div>
      {loading ? (
        <div className="text-text-secondary">Loading brands…</div>
      ) : editing ? (
        <BrandForm
          brand={editing === 'new' ? null : editing}
          workspaceId={workspaceId!}
          isOwner={isOwner}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          onSetDefault={handleSetDefault}
        />
      ) : (
        <div className="flex flex-col">
          {brands.length === 0 ? (
            <p className="text-text-secondary text-sm">No brand set.</p>
          ) : (
            brands.map((brand) => (
              <BrandRow
                key={brand.id}
                brand={brand}
                isMultiple={brands.length > 1}
                isOwner={isOwner}
                onEdit={() => setEditing(brand)}
                onDelete={() => void handleDelete(brand.id)}
              />
            ))
          )}
          {brands.length > 0 && (
            <div className="mt-6 p-4 bg-accent rounded-lg">
              <p className="text-sm font-medium text-foreground mb-2">
                Using multiple brands with Login with DIMO
              </p>
              <pre className="text-xs font-mono text-text-secondary overflow-x-auto">{`dimo.login({ clientId: '${fragment.clientId}', brandName: 'Fleet App' })`}</pre>
              <p className="text-xs text-text-secondary mt-1">
                Omit <code>brandName</code> to use your default brand.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  </div>
);
```

- [ ] **Step 2: Remove the `CollapsibleSection` import from Brand.tsx**

Delete this line:

```tsx
import { CollapsibleSection } from '@/components/CollapsibleSection';
```

- [ ] **Step 3: Remove the stale CollapsibleSection mock from Brand.test.tsx**

Remove lines 4–18 (the `jest.mock('@/components/CollapsibleSection', ...)` block and the two `CollapsibleSection.Title` / `CollapsibleSection.Content` assignments). The test file's top should go directly from the import to the `jest.mock('@/gql', ...)` block:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Brand } from '@/app/license/[tokenId]/details/components/Brand/Brand';

jest.mock('@/gql', () => ({
  // ... rest unchanged
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --testPathPattern="Brand.test"
```

Expected: all 6 Brand tests pass.

- [ ] **Step 5: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/license/\[tokenId\]/details/components/Brand/ __tests__/unit/pages/license/\[tokenId\]/details/Brand.test.tsx
git commit -m "refactor: remove CollapsibleSection from Brand, clean up test mock"
```

---

## Task 7: Rewrite View.tsx + View.css

Full rewrite of the page composition layer. Adds tab state, persistent header with inline Summary content, and 4 tab panels. The `Summary` component folder is deleted in Task 8.

**Files:**

- Modify: `src/app/license/[tokenId]/details/components/View/View.tsx`
- Modify: `src/app/license/[tokenId]/details/components/View/View.css`

- [ ] **Step 1: Write the new View.css**

```css
.license-details-page {
  @apply flex flex-col;
}

/* ── Header ──────────────────────────────────────────────── */

.license-header {
  @apply bg-card border-b border-border px-6 pt-5 pb-0;
}

.license-header__top {
  @apply flex items-start justify-between mb-3;
}

.license-header__identity {
  @apply flex items-center gap-2 flex-wrap;
}

.license-header__name {
  @apply text-xl font-bold text-foreground;
}

.license-header__token-id {
  @apply text-xs font-medium text-text-secondary bg-accent px-2 py-0.5 rounded-full;
}

.license-header__rename-btn {
  @apply text-text-secondary hover:text-foreground transition-colors cursor-pointer p-0.5;
}

.license-header__client-id {
  @apply mb-4;
}

/* ── Tabs ────────────────────────────────────────────────── */

.license-tabs {
  @apply flex -mb-px;
}

.license-tab {
  @apply px-4 py-2.5 text-sm font-medium text-text-secondary border-b-2 border-transparent
         cursor-pointer transition-colors hover:text-foreground select-none;
}

.license-tab--active {
  @apply text-foreground border-b-foreground;
}

/* ── Tab content ─────────────────────────────────────────── */

.license-tab-content {
  @apply p-6 flex flex-col gap-4;
}

/* ── Overview ────────────────────────────────────────────── */

.overview-stats {
  @apply grid grid-cols-2 gap-4;
}

.overview-quick-actions {
  @apply flex flex-col gap-2;
}

.overview-quick-actions__label {
  @apply text-xs uppercase tracking-wide text-text-secondary font-medium;
}

.overview-quick-actions__grid {
  @apply flex flex-wrap gap-3;
}

.overview-quick-action {
  @apply bg-accent border border-border rounded-lg px-4 py-2.5 text-sm text-foreground
         hover:border-foreground/30 transition-colors cursor-pointer flex items-center gap-2;
}
```

- [ ] **Step 2: Write the new View.tsx**

```tsx
'use client';
import { useEffect, useState } from 'react';
import { PencilIcon } from '@heroicons/react/16/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gql } from '@/gql';
import { useQuery } from '@apollo/client';
import { useFragment } from '@/gql';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';
import { CopyableRow } from '@/components/CopyableRow';
import { WorkspaceNameModal } from '@/components/WorkspaceNameModal';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { Loader } from '@/components/Loader';
import { Signers } from '@/app/license/[tokenId]/details/components/Signers';
import { RedirectUris } from '@/app/license/[tokenId]/details/components/RedirectUris';
import { Vehicles } from '@/app/license/[tokenId]/details/components/Vehicles';
import { DeveloperJwts } from '@/app/license/[tokenId]/details/components/DeveloperJwts';
import { Brand } from '@/app/license/[tokenId]/details/components/Brand';
import { Usage } from '@/app/license/[tokenId]/details/components/Usage/Usage';

import './View.css';

type Tab = 'overview' | 'config' | 'vehicles' | 'brand';

const IDENTITY_API_UPDATE_DELAY = 6000;

const GET_DEVELOPER_LICENSE = gql(`
  query GetDeveloperLicense($tokenId: Int!) {
    developerLicense(by: {tokenId: $tokenId}) {
      ...DeveloperLicenseSummaryFragment
      ...SignerFragment
      ...RedirectUriFragment
      ...DeveloperLicenseVehiclesFragment
      ...DeveloperJwtsFragment
      ...BrandFragment
    }
  }
`);

export const View = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const [tokenId, setTokenId] = useState<number>();
  const { data, loading, refetch, error } = useQuery(GET_DEVELOPER_LICENSE, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });

  const handleRefetch = async () => {
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        refetch({ tokenId })
          .then(() => resolve())
          .catch(reject);
      }, IDENTITY_API_UPDATE_DELAY);
    });
  };

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    void getTokenId();
  }, [params]);

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

  if (!data?.developerLicense) return null;

  return (
    <LicenseDetailsContent license={data.developerLicense} refetch={handleRefetch} />
  );
};

type LicenseData = NonNullable<
  Awaited<
    ReturnType<ReturnType<typeof useQuery<typeof GET_DEVELOPER_LICENSE>>['refetch']>
  >['data']['developerLicense']
>;
```

Wait — getting the type of `data.developerLicense` cleanly from a gql codegen query requires importing the generated query type. The simpler approach used in this codebase is to just pass the fragment type. But since `data.developerLicense` is the full object that satisfies all fragments, we can type the inner component prop generically.

Replace the `LicenseData` type alias and `LicenseDetailsContent` with this pattern (avoids importing generated query types directly):

```tsx
// Continuing View.tsx after the View component export...

type LicenseRecord =
  NonNullable<typeof data> extends { developerLicense: infer L } ? NonNullable<L> : never;
// ↑ This doesn't work in module scope. Use the simpler cast approach below.
```

Instead, use an `as` cast at the call site and type the inner component prop as `object` with `as never` in the fragment call (matching the pattern already used in this codebase for `mockLicense as never` in tests). The correct approach for this codebase is:

```tsx
// After the GET_DEVELOPER_LICENSE gql call, TypeScript infers the result type.
// data.developerLicense is `GetDeveloperLicenseQuery['developerLicense']`.
// Pass it directly — TypeScript infers the type at the call site.
```

Revised complete **View.tsx**:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { PencilIcon } from '@heroicons/react/16/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gql, useFragment } from '@/gql';
import { useQuery } from '@apollo/client';
import { FragmentType } from '@/gql';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';
import { CopyableRow } from '@/components/CopyableRow';
import { WorkspaceNameModal } from '@/components/WorkspaceNameModal';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import { Loader } from '@/components/Loader';
import { Signers } from '@/app/license/[tokenId]/details/components/Signers';
import { RedirectUris } from '@/app/license/[tokenId]/details/components/RedirectUris';
import {
  Vehicles,
  GET_VEHICLE_COUNT_BY_CLIENT_ID,
} from '@/app/license/[tokenId]/details/components/Vehicles/Vehicles';
import { DeveloperJwts } from '@/app/license/[tokenId]/details/components/DeveloperJwts';
import { Brand } from '@/app/license/[tokenId]/details/components/Brand';
import { Usage } from '@/app/license/[tokenId]/details/components/Usage/Usage';
import './View.css';

type Tab = 'overview' | 'config' | 'vehicles' | 'brand';

const IDENTITY_API_UPDATE_DELAY = 6000;

const GET_DEVELOPER_LICENSE = gql(`
  query GetDeveloperLicense($tokenId: Int!) {
    developerLicense(by: {tokenId: $tokenId}) {
      ...DeveloperLicenseSummaryFragment
      ...SignerFragment
      ...RedirectUriFragment
      ...DeveloperLicenseVehiclesFragment
      ...DeveloperJwtsFragment
      ...BrandFragment
    }
  }
`);

export const View = ({ params }: { params: Promise<{ tokenId: string }> }) => {
  const [tokenId, setTokenId] = useState<number>();
  const { data, loading, refetch, error } = useQuery(GET_DEVELOPER_LICENSE, {
    variables: { tokenId: tokenId as number },
    skip: !tokenId,
  });

  const handleRefetch = async () =>
    new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        refetch({ tokenId })
          .then(() => resolve())
          .catch(reject);
      }, IDENTITY_API_UPDATE_DELAY);
    });

  useEffect(() => {
    const getTokenId = async () => {
      const { tokenId: tokenIdParam } = await params;
      setTokenId(Number(tokenIdParam));
    };
    void getTokenId();
  }, [params]);

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

  if (!data?.developerLicense) return null;

  return (
    <LicenseDetailsContent license={data.developerLicense} refetch={handleRefetch} />
  );
};

interface LicenseDetailsContentProps {
  license: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT> &
    Parameters<typeof Signers>[0]['license'] &
    Parameters<typeof RedirectUris>[0]['license'] &
    Parameters<typeof Vehicles>[0]['license'] &
    Parameters<typeof DeveloperJwts>[0]['license'] &
    Parameters<typeof Brand>[0]['license'] &
    Parameters<typeof Usage>[0]['license'];
  refetch: () => Promise<void>;
}

const LicenseDetailsContent = ({ license, refetch }: LicenseDetailsContentProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const router = useRouter();
  const licenseFragment = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, license);
  const isLicenseOwner = useIsLicenseOwner(licenseFragment);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'config', label: 'Config' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'brand', label: 'Brand' },
  ];

  return (
    <div className="license-details-page">
      {/* Persistent header */}
      <div className="license-header">
        <div className="license-header__top">
          <div className="license-header__identity">
            <span className="license-header__name">{licenseFragment.alias}</span>
            <span className="license-header__token-id">#{licenseFragment.tokenId}</span>
            {isLicenseOwner && (
              <button
                className="license-header__rename-btn"
                onClick={() => setIsRenameOpen(true)}
                title="Rename"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        <div className="license-header__client-id">
          <CopyableRow
            value={licenseFragment.clientId}
            onCopySuccessMessage="Client ID copied!"
          />
        </div>
        <nav className="license-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`license-tab${activeTab === tab.id ? ' license-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="license-tab-content">
        {activeTab === 'overview' && (
          <>
            <div className="overview-stats">
              <Usage license={license} />
              <div className="overview-stat-card">
                <VehicleCountStat
                  clientId={licenseFragment.clientId}
                  onViewVehicles={() => setActiveTab('vehicles')}
                />
              </div>
            </div>
            <div className="overview-quick-actions">
              <p className="overview-quick-actions__label">Quick actions</p>
              <div className="overview-quick-actions__grid">
                <button
                  className="overview-quick-action"
                  onClick={() => setActiveTab('config')}
                >
                  🔑 Generate API Key
                </button>
                <button
                  className="overview-quick-action"
                  onClick={() => setActiveTab('config')}
                >
                  🪪 Generate JWT
                </button>
                <button
                  className="overview-quick-action"
                  onClick={() =>
                    router.push(`/license/${licenseFragment.tokenId}/configurator`)
                  }
                >
                  ⚙️ Setup Vehicle Sharing
                </button>
                <Link
                  href="https://docs.dimo.org"
                  target="_blank"
                  className="overview-quick-action"
                >
                  📖 Docs
                </Link>
              </div>
            </div>
          </>
        )}

        {activeTab === 'config' && (
          <>
            <Signers license={license} refetch={refetch} />
            <DeveloperJwts license={license} />
            <RedirectUris license={license} refetch={refetch} />
          </>
        )}

        {activeTab === 'vehicles' && <Vehicles license={license} />}

        {activeTab === 'brand' && <Brand license={license} />}
      </div>

      <WorkspaceNameModal
        isOpen={isRenameOpen}
        setIsOpen={setIsRenameOpen}
        license={licenseFragment}
        onSuccess={refetch}
      />
    </div>
  );
};

const VehicleCountStat = ({
  clientId,
  onViewVehicles,
}: {
  clientId: string;
  onViewVehicles: () => void;
}) => {
  const { data, loading } = useQuery(GET_VEHICLE_COUNT_BY_CLIENT_ID, {
    variables: { clientId },
  });

  if (loading) return <p className="overview-stat-card__number">…</p>;

  return (
    <>
      <button
        onClick={onViewVehicles}
        className="overview-stat-card__number hover:opacity-80 transition-opacity text-left"
      >
        {data?.vehicles.totalCount ?? '—'}
      </button>
      <p className="overview-stat-card__label">Vehicles Connected</p>
      <button onClick={onViewVehicles} className="overview-stat-card__link">
        View vehicles →
      </button>
    </>
  );
};

export default View;
```

**Note on typing:** The `LicenseDetailsContentProps.license` type uses an intersection of all fragment types. If TypeScript complains about the intersection being too complex, replace it with `license: Parameters<typeof Brand>[0]['license']` (Brand's fragment is the superset that includes `owner`, `tokenId`, `clientId`) and add `as` casts at each component call site. In practice the Apollo codegen masking system accepts `data.developerLicense` at all fragment prop positions.

- [ ] **Step 3: Run compile check**

```bash
npm run compile
```

Fix any TypeScript errors before proceeding. Common fix: if the `LicenseDetailsContentProps` intersection causes issues, simplify the `license` prop type to `object` and add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` or use `as never` casts matching the existing codebase pattern (see how `mockLicense as never` is used in tests).

- [ ] **Step 4: Run lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Run tests**

```bash
npm test
```

Expected: all tests pass (Brand tests now run without CollapsibleSection mock).

- [ ] **Step 6: Commit**

```bash
git add src/app/license/\[tokenId\]/details/components/View/
git commit -m "feat: redesign license details page with tab layout and persistent header"
```

---

## Task 8: Delete Summary component folder

The Summary component and its sub-components (AliasAndTokenId, ClientId) are now unused — their logic is inlined in View.tsx.

**Files:**

- Delete: `src/app/license/[tokenId]/details/components/Summary/` (entire folder)

- [ ] **Step 1: Verify Summary is no longer imported anywhere**

```bash
grep -r "from.*Summary" src/app/license/\[tokenId\]/details/
```

Expected: no results.

- [ ] **Step 2: Delete the Summary folder**

```bash
rm -rf "src/app/license/[tokenId]/details/components/Summary"
```

- [ ] **Step 3: Run compile + lint + tests**

```bash
npm run compile && npm run lint && npm test
```

Expected: no errors, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: delete unused Summary component (inlined into View header)"
```

---

## Self-Review Notes

- **Spec §Overview quick actions**: Generate API Key and Generate JWT switch to Config tab — implemented via `setActiveTab('config')`. ✓
- **Spec §Vehicles tab**: count + 3 action buttons — implemented in Vehicles.tsx with Vehicle List, Simulator, Configure Sharing. ✓
- **Spec §Config tab flat sections**: CollapsibleSection removed from all 4 inner components (Tasks 3–6). ✓
- **Spec §Persistent header**: alias + tokenId + clientId + rename — implemented in LicenseDetailsContent header. ✓
- **Spec §Summary deletion**: inlined in View header, folder deleted in Task 8. ✓
- **Spec §Usage cluster prop removal**: done in Task 1. ✓
- **Spec §Vehicles cluster prop removal**: done in Task 2. ✓
- **`VehicleCountStat` in Overview**: uses `GET_VEHICLE_COUNT_BY_CLIENT_ID` (exported from Vehicles.tsx) — Apollo caches it so the Vehicles tab query is a free cache hit. ✓
- **WorkspaceNameModal**: now instantiated in `LicenseDetailsContent` rather than `Summary`, receives `licenseFragment` which has the same fields. ✓
- **`goBack` function removed**: the spec doesn't mention a back button, and removing it simplifies the View. If needed, it can be re-added. ✓
