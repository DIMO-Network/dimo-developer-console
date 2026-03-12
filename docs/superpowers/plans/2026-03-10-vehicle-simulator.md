# Vehicle Simulator Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Vehicle Simulator" section to the home page that lets developers mint test vehicles on Polygon Amoy using the existing frontend transaction infrastructure.

**Architecture:** A new `VehicleSimulator` component is mounted in `View.tsx` below `LicenseList`, receives the license connection fragment, extracts the first license's `clientId` to use as the SACD grantee, renders inline make/model/year dropdowns, and calls `useMintVehicle` on submit. Minted vehicles are stored in local React state and rendered below the form.

**Tech Stack:** Next.js 15 App Router, React 18, TypeScript, Viem (`encodeFunctionData`), ZeroDev (`processTransactions` via `useContractGA`), Apollo GraphQL, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-03-10-vehicle-simulator-design.md`

---

## Chunk 1: Foundation — ABI, Config, Constants, Hook

### Task 1: Add DimoRegistry ABI

**Files:**

- Create: `src/contracts/DimoRegistryABI.json`

- [ ] **Step 1: Write the ABI file**

Create `src/contracts/DimoRegistryABI.json` with exactly this content — a minimal ABI fragment covering `mintVehicleWithDeviceDefinition` and the `VehicleNodeMinted` event used to extract the token ID from logs:

```json
[
  {
    "inputs": [
      { "internalType": "uint256", "name": "manufacturerNode", "type": "uint256" },
      { "internalType": "address", "name": "owner", "type": "address" },
      { "internalType": "string", "name": "deviceDefinitionId", "type": "string" },
      {
        "components": [
          { "internalType": "string", "name": "attribute", "type": "string" },
          { "internalType": "string", "name": "info", "type": "string" }
        ],
        "internalType": "struct AttributeInfoPair[]",
        "name": "attrInfo",
        "type": "tuple[]"
      },
      {
        "components": [
          { "internalType": "address", "name": "grantee", "type": "address" },
          { "internalType": "uint256", "name": "permissions", "type": "uint256" },
          { "internalType": "uint256", "name": "expiration", "type": "uint256" },
          { "internalType": "string", "name": "source", "type": "string" }
        ],
        "internalType": "struct SacdInput",
        "name": "sacdInput",
        "type": "tuple"
      }
    ],
    "name": "mintVehicleWithDeviceDefinition",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "manufacturerNode",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "tokenId",
        "type": "uint256"
      },
      { "indexed": true, "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "VehicleNodeMinted",
    "type": "event"
  }
]
```

- [ ] **Step 2: Commit**

```bash
git add src/contracts/DimoRegistryABI.json
git commit -m "feat: add DimoRegistry ABI fragment for mintVehicleWithDeviceDefinition"
```

---

### Task 2: Add Registry Address to Config

**Files:**

- Modify: `src/config/default.ts`

- [ ] **Step 1: Add the constant**

In `src/config/default.ts`, add after `DCC_ADDRESS`:

```ts
// DIMO REGISTRY AMOY
export const DIMO_REGISTRY_ADDRESS: `0x${string}` =
  '0x5eAA326fB2fc97fAcCe6A79A304876daD0F2e96c';
```

- [ ] **Step 2: Verify the config export**

Run:

```bash
grep -n "DIMO_REGISTRY_ADDRESS" src/config/default.ts
```

Expected: one match on the newly added line.

- [ ] **Step 3: Commit**

```bash
git add src/config/default.ts
git commit -m "feat: add DIMO_REGISTRY_ADDRESS to config"
```

---

### Task 3: Vehicle Simulator Constants

**Files:**

- Create: `src/app/app/list/components/VehicleSimulator/constants.ts`
- Test: `src/app/app/list/components/VehicleSimulator/__tests__/constants.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/app/list/components/VehicleSimulator/__tests__/constants.test.ts`:

```ts
import { MAKES, YEARS, buildDeviceDefinitionId } from '../constants';

describe('VehicleSimulator constants', () => {
  it('has exactly 5 makes', () => {
    expect(MAKES).toHaveLength(5);
  });

  it('each make has exactly 2 models', () => {
    MAKES.forEach((make) => {
      expect(make.models).toHaveLength(2);
    });
  });

  it('years range from 2022 to 2026 inclusive', () => {
    expect(YEARS).toEqual([2022, 2023, 2024, 2025, 2026]);
  });

  it('buildDeviceDefinitionId produces correct slug', () => {
    expect(buildDeviceDefinitionId('toyota', 'camry', 2022)).toBe('toyota-camry-2022');
    expect(buildDeviceDefinitionId('mercedes-benz', 's-class', 2023)).toBe(
      'mercedes-benz-s-class-2023',
    );
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

```bash
npx jest src/app/app/list/components/VehicleSimulator/__tests__/constants.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../constants'"

- [ ] **Step 3: Write the constants**

Create `src/app/app/list/components/VehicleSimulator/constants.ts`:

```ts
export interface VehicleMake {
  label: string;
  slug: string;
  nodeId: number;
  models: { label: string; slug: string }[];
}

export const MAKES: VehicleMake[] = [
  {
    label: 'Toyota',
    slug: 'toyota',
    nodeId: 131,
    models: [
      { label: 'Camry', slug: 'camry' },
      { label: 'RAV4', slug: 'rav4' },
    ],
  },
  {
    label: 'Ford',
    slug: 'ford',
    nodeId: 41,
    models: [
      { label: 'F-150', slug: 'f-150' },
      { label: 'Mustang', slug: 'mustang' },
    ],
  },
  {
    label: 'Tesla',
    slug: 'tesla',
    nodeId: 130,
    models: [
      { label: 'Model 3', slug: 'model-3' },
      { label: 'Model Y', slug: 'model-y' },
    ],
  },
  {
    label: 'BMW',
    slug: 'bmw',
    nodeId: 13,
    models: [
      { label: '3 Series', slug: '3-series' },
      { label: 'X5', slug: 'x5' },
    ],
  },
  {
    label: 'Honda',
    slug: 'honda',
    nodeId: 48,
    models: [
      { label: 'Civic', slug: 'civic' },
      { label: 'CR-V', slug: 'cr-v' },
    ],
  },
];

export const YEARS = [2022, 2023, 2024, 2025, 2026];

export function buildDeviceDefinitionId(
  makeSlug: string,
  modelSlug: string,
  year: number,
): string {
  return `${makeSlug}-${modelSlug}-${year}`;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/app/app/list/components/VehicleSimulator/__tests__/constants.test.ts --no-coverage
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/list/components/VehicleSimulator/constants.ts \
        src/app/app/list/components/VehicleSimulator/__tests__/constants.test.ts
git commit -m "feat: add VehicleSimulator constants and buildDeviceDefinitionId"
```

---

### Task 4: useMintVehicle Hook

**Files:**

- Create: `src/hooks/useMintVehicle.ts`

The hook mirrors `useMintLicense` from `src/hooks/useTransactions.ts`. It encodes the `mintVehicleWithDeviceDefinition` call and returns the minted vehicle's tokenId extracted from transaction logs.

**About the VehicleNodeMinted topic hash:** The event `VehicleNodeMinted(uint256,uint256,address)` has a keccak256 topic. During implementation, compute it with:

```ts
import { keccak256, toBytes } from 'viem';
const topic = keccak256(toBytes('VehicleNodeMinted(uint256,uint256,address)'));
```

Store it as a constant `VEHICLE_NODE_MINTED_TOPIC` in the hook file and use it for log filtering (same pattern as `ISSUED_TOPIC` in `src/config/default.ts`).

- [ ] **Step 1: Create the hook**

Create `src/hooks/useMintVehicle.ts`:

```ts
import { useCallback } from 'react';
import { Abi, encodeFunctionData, keccak256, toBytes } from 'viem';
import { useContractGA, useGlobalAccount } from '@/hooks';
import configuration from '@/config';
import DimoRegistryABI from '@/contracts/DimoRegistryABI.json';
import { decodeHex } from '@/utils/formatHex';
import { buildDeviceDefinitionId } from '@/app/app/list/components/VehicleSimulator/constants';

// keccak256("VehicleNodeMinted(uint256,uint256,address)")
const VEHICLE_NODE_MINTED_TOPIC = keccak256(
  toBytes('VehicleNodeMinted(uint256,uint256,address)'),
);

export interface MintVehicleParams {
  manufacturerNodeId: number;
  makeSlug: string;
  modelSlug: string;
  year: number;
  clientId: `0x${string}`;
}

export const useMintVehicle = () => {
  const { processTransactions } = useContractGA();
  const { currentUser } = useGlobalAccount();

  return useCallback(
    async ({
      manufacturerNodeId,
      makeSlug,
      modelSlug,
      year,
      clientId,
    }: MintVehicleParams) => {
      if (!currentUser?.smartContractAddress) throw new Error('User session is invalid');

      const deviceDefinitionId = buildDeviceDefinitionId(makeSlug, modelSlug, year);

      const result = await processTransactions(
        [
          {
            to: configuration.DIMO_REGISTRY_ADDRESS,
            value: BigInt(0),
            data: encodeFunctionData({
              abi: DimoRegistryABI,
              functionName: 'mintVehicleWithDeviceDefinition',
              args: [
                BigInt(manufacturerNodeId),
                currentUser.smartContractAddress,
                deviceDefinitionId,
                [],
                {
                  grantee: clientId,
                  permissions: BigInt('0xFFFFFFFFFFFFFFFF'),
                  expiration: BigInt(0),
                  source: '',
                },
              ],
            }),
          },
        ],
        { abi: DimoRegistryABI as Abi },
      );

      // Extract tokenId from VehicleNodeMinted event logs (topics[1] = tokenId)
      const { topics: [, rawTokenId = '0x'] = [] } =
        result.logs?.find(
          ({ topics: [topic = '0x'] = [] }) => topic === VEHICLE_NODE_MINTED_TOPIC,
        ) ?? {};

      const tokenId =
        rawTokenId !== '0x'
          ? Number(decodeHex(rawTokenId as `0x${string}`, 'uint256'))
          : null;

      return { ...result, tokenId };
    },
    [currentUser, processTransactions],
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -i "useMintVehicle\|DimoRegistry"
```

Expected: no output (no errors for these files).

- [ ] **Step 3: Export from hooks index**

First check if the export already exists:

```bash
grep -n "useMintVehicle" src/hooks/index.ts
```

If no output, add to `src/hooks/index.ts`:

```ts
export { useMintVehicle } from './useMintVehicle';
```

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useMintVehicle.ts src/hooks/index.ts
git commit -m "feat: add useMintVehicle hook"
```

---

## Chunk 2: UI Component

### Task 5: VehicleSimulator Component

**Files:**

- Create: `src/app/app/list/components/VehicleSimulator/index.tsx`
- Test: `src/app/app/list/components/VehicleSimulator/__tests__/VehicleSimulator.test.tsx`

The component:

1. Accepts `licenseConnection` (fragment type from `GET_LICENSE_SUMMARIES`)
2. Extracts the first license's `clientId` using `useFragment`
3. Shows three chained `<select>` dropdowns: make → model (resets on make change) → year
4. Disables the button until all three are selected
5. On submit: calls `useMintVehicle`, shows loading state, appends minted vehicle to local state list
6. Renders minted vehicles below the form with tokenId + MMY

- [ ] **Step 1: Write the failing tests**

Create `src/app/app/list/components/VehicleSimulator/__tests__/VehicleSimulator.test.tsx`:

```tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VehicleSimulator } from '../index';
import { MockedProvider } from '@apollo/client/testing';
import { NotificationContext } from '@/context/notificationContext';

// Mock useMintVehicle — no Web3 infrastructure needed in unit tests
jest.mock('@/hooks', () => ({
  useMintVehicle: jest.fn(() => jest.fn()),
}));

const mockSetNotification = jest.fn();
const mockClientId = '0x1234567890123456789012345678901234567890' as `0x${string}`;

describe('VehicleSimulator', () => {
  const renderComponent = () =>
    render(
      <NotificationContext.Provider value={{ setNotification: mockSetNotification }}>
        <MockedProvider>
          <VehicleSimulator clientId={mockClientId} />
        </MockedProvider>
      </NotificationContext.Provider>,
    );

  it('renders the section heading', () => {
    renderComponent();
    expect(screen.getByText('Vehicle Simulator')).toBeInTheDocument();
  });

  it('renders the Make, Model, and Year dropdowns', () => {
    renderComponent();
    expect(screen.getByLabelText('Make')).toBeInTheDocument();
    expect(screen.getByLabelText('Model')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
  });

  it('disables the mint button until all fields are selected', () => {
    renderComponent();
    const button = screen.getByRole('button', { name: /create a simulated vehicle/i });
    expect(button).toBeDisabled();
  });

  it('enables the mint button when all dropdowns are selected', () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'toyota' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'camry' } });
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '2022' } });
    const button = screen.getByRole('button', { name: /create a simulated vehicle/i });
    expect(button).not.toBeDisabled();
  });

  it('resets model when make changes', () => {
    renderComponent();
    fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'toyota' } });
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'camry' } });
    fireEvent.change(screen.getByLabelText('Make'), { target: { value: 'ford' } });
    // model should reset to empty
    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('');
  });
});
```

- [ ] **Step 2: Run to confirm tests fail**

```bash
npx jest src/app/app/list/components/VehicleSimulator/__tests__/VehicleSimulator.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../index'"

- [ ] **Step 3: Implement the component**

> **Note:** The test above uses a simplified `clientId` prop. Implement the component to accept `clientId: \`0x${string}\`` directly — the fragment unwrapping happens one level up in View.tsx (Task 6). This keeps the component simpler and easier to test.

Create `src/app/app/list/components/VehicleSimulator/index.tsx`:

```tsx
'use client';
import { FC, useContext, useState } from 'react';
import { Button } from '@/components/Button';
import { NotificationContext } from '@/context/notificationContext';
import { useMintVehicle } from '@/hooks';
import { MAKES, YEARS, VehicleMake } from './constants';

interface MintedVehicle {
  tokenId: number;
  make: string;
  model: string;
  year: number;
}

interface Props {
  clientId: `0x${string}`;
}

export const VehicleSimulator: FC<Props> = ({ clientId }) => {
  const { setNotification } = useContext(NotificationContext);
  const mintVehicle = useMintVehicle();

  const [selectedMakeSlug, setSelectedMakeSlug] = useState('');
  const [selectedModelSlug, setSelectedModelSlug] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mintedVehicles, setMintedVehicles] = useState<MintedVehicle[]>([]);

  const selectedMake: VehicleMake | undefined = MAKES.find(
    (m) => m.slug === selectedMakeSlug,
  );
  const canMint = !!selectedMakeSlug && !!selectedModelSlug && !!selectedYear;

  const handleMakeChange = (makeSlug: string) => {
    setSelectedMakeSlug(makeSlug);
    setSelectedModelSlug('');
  };

  const handleMint = async () => {
    if (!selectedMake || !selectedModelSlug || !selectedYear) return;
    try {
      setIsLoading(true);
      const result = await mintVehicle({
        manufacturerNodeId: selectedMake.nodeId,
        makeSlug: selectedMake.slug,
        modelSlug: selectedModelSlug,
        year: Number(selectedYear),
        clientId,
      });

      if (!result.success) {
        setNotification(result.reason ?? 'Minting failed', 'Error', 'error');
        return;
      }

      const modelLabel =
        selectedMake.models.find((m) => m.slug === selectedModelSlug)?.label ??
        selectedModelSlug;

      setMintedVehicles((prev) => [
        ...prev,
        {
          tokenId: result.tokenId ?? 0,
          make: selectedMake.label,
          model: modelLabel,
          year: Number(selectedYear),
        },
      ]);

      setNotification('Vehicle minted successfully!', 'Success', 'success');
    } catch {
      setNotification(
        'Something went wrong while minting the vehicle',
        'Oops...',
        'error',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="license-list-content">
      <div className="description">
        <p className="title">Vehicle Simulator</p>
        <p className="text-sm text-text-secondary">
          Mint a simulated test vehicle on Polygon Amoy for development and testing.
        </p>
      </div>

      <div className="flex flex-col gap-4 max-w-sm">
        {/* Make */}
        <div className="flex flex-col gap-1">
          <label htmlFor="sim-make" className="text-sm font-medium">
            Make
          </label>
          <select
            id="sim-make"
            aria-label="Make"
            className="rounded-lg border border-surface-stroke bg-surface-raised px-3 py-2 text-sm"
            value={selectedMakeSlug}
            disabled={isLoading}
            onChange={(e) => handleMakeChange(e.target.value)}
          >
            <option value="">Select make</option>
            {MAKES.map((make) => (
              <option key={make.slug} value={make.slug}>
                {make.label}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1">
          <label htmlFor="sim-model" className="text-sm font-medium">
            Model
          </label>
          <select
            id="sim-model"
            aria-label="Model"
            className="rounded-lg border border-surface-stroke bg-surface-raised px-3 py-2 text-sm disabled:opacity-50"
            value={selectedModelSlug}
            disabled={!selectedMakeSlug || isLoading}
            onChange={(e) => setSelectedModelSlug(e.target.value)}
          >
            <option value="">Select model</option>
            {selectedMake?.models.map((model) => (
              <option key={model.slug} value={model.slug}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {/* Year */}
        <div className="flex flex-col gap-1">
          <label htmlFor="sim-year" className="text-sm font-medium">
            Year
          </label>
          <select
            id="sim-year"
            aria-label="Year"
            className="rounded-lg border border-surface-stroke bg-surface-raised px-3 py-2 text-sm disabled:opacity-50"
            value={selectedYear}
            disabled={isLoading}
            onChange={(e) => setSelectedYear(e.target.value)}
          >
            <option value="">Select year</option>
            {YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <Button
          className="white !h-10"
          disabled={!canMint}
          loading={isLoading}
          onClick={handleMint}
        >
          Create a simulated vehicle
        </Button>
      </div>

      {/* Minted vehicles list */}
      {mintedVehicles.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          <p className="text-sm font-medium">Simulated Vehicles</p>
          <div className="flex flex-col gap-2">
            {mintedVehicles.map((vehicle, idx) => (
              <div
                key={idx}
                className="flex flex-row items-center justify-between rounded-lg border border-surface-stroke bg-surface-raised px-4 py-3 text-sm"
              >
                <span className="font-medium">
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </span>
                <span className="text-text-secondary">Token ID: {vehicle.tokenId}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npx jest src/app/app/list/components/VehicleSimulator/__tests__/VehicleSimulator.test.tsx --no-coverage
```

Expected: PASS — 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/list/components/VehicleSimulator/index.tsx \
        src/app/app/list/components/VehicleSimulator/__tests__/VehicleSimulator.test.tsx
git commit -m "feat: add VehicleSimulator component"
```

---

## Chunk 3: Integration

### Task 6: Wire VehicleSimulator into View.tsx

**Files:**

- Modify: `src/app/app/list/components/View/View.tsx`

The View already fetches `data.developerLicenses` which contains the `DeveloperLicenseSummariesOnConnection` fragment (includes `clientId` per the `DeveloperLicenseSummaryFragment`). Use `useFragment` with the existing `GET_LICENSE_SUMMARIES` fragment to extract the first license's `clientId`, then pass it to `VehicleSimulator`.

- [ ] **Step 1: Update View.tsx**

The key constraint: `useFragment` from `@/gql` (GraphQL Code Generator) is not a real React hook — it's `return fragmentType as any` under the hood — but `eslint-plugin-react-hooks` matches on the `use` prefix and will flag conditional calls. Solve this by extracting fragment unwrapping into a dedicated `VehicleSimulatorSection` wrapper component where both calls happen unconditionally at the top of the function body.

Modify `src/app/app/list/components/View/View.tsx`:

```tsx
'use client';
import { type FC } from 'react';

import { Loader } from '@/components/Loader';
import { OnboardingBanner } from '@/components/OnboardingBanner';
import { useGlobalAccount, useOnboarding, useUser } from '@/hooks';
import Image from 'next/image';
import { LicenseList, GET_LICENSE_SUMMARIES } from '@/app/license/list';
import './View.css';
import { FragmentType, gql, useFragment } from '@/gql';
import { useQuery } from '@apollo/client';
import { BubbleLoader } from '@/components/BubbleLoader';
import { AppListRightPanel } from '@/app/app/list/components/RightPanel';
import { VehicleSimulator } from '@/app/app/list/components/VehicleSimulator';
import { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from '@/components/LicenseCard';

const GET_DEVELOPER_LICENSES_BY_OWNER = gql(`
  query GetDeveloperLicensesByOwner($owner: Address!) {
    developerLicenses(first: 100, filterBy: { owner: $owner }) {
      ...TotalDeveloperLicenseCountFragment
      ...DeveloperLicenseSummariesOnConnection
    }
  }
`);

function getFirstName(name: string) {
  const trimmed = name.trim();
  const [firstName] = trimmed.split(' ');
  return firstName || '';
}

/**
 * Wrapper that unwraps fragment data and passes clientId to VehicleSimulator.
 * Exists as a separate component so both useFragment calls are unconditional
 * at the top of its render, satisfying eslint-plugin-react-hooks.
 */
const VehicleSimulatorSection: FC<{
  licenseConnection: FragmentType<typeof GET_LICENSE_SUMMARIES>;
}> = ({ licenseConnection }) => {
  const { nodes } = useFragment(GET_LICENSE_SUMMARIES, licenseConnection);
  // useFragment is `return fragmentType as any` — safe to call with undefined input.
  // The `!` assertion satisfies TypeScript; undefined nodes[0] yields undefined at runtime.
  const firstLicense = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, nodes[0]!);
  if (!firstLicense?.clientId) return null;
  return <VehicleSimulator clientId={firstLicense.clientId} />;
};

export const View: FC = () => {
  const { balance, isLoading: loadingBalance } = useOnboarding();
  const { data: user, isLoading: loadingUser } = useUser();
  const { currentUser } = useGlobalAccount();
  const {
    data,
    error,
    loading: loadingDevLicenses,
  } = useQuery(GET_DEVELOPER_LICENSES_BY_OWNER, {
    variables: { owner: currentUser?.smartContractAddress ?? '' },
    skip: !currentUser?.smartContractAddress,
  });
  const userFirstName = getFirstName(user?.name ?? '');

  return (
    <div className={'flex flex-1 flex-row'}>
      <div className="app-list-page">
        <div className="welcome-message">
          {loadingUser ? (
            <BubbleLoader isLoading isSmall />
          ) : (
            <>
              <Image
                src={'/images/waving_hand.svg'}
                width={16}
                height={16}
                alt={'waving-hand'}
              />
              <p className="title">Welcome{userFirstName ? `, ${userFirstName}` : '!'}</p>
            </>
          )}
        </div>

        {loadingBalance && loadingDevLicenses && <Loader isLoading={true} />}
        {!!error && <p>There was an error fetching your developer licenses</p>}
        {!!data?.developerLicenses && (
          <>
            <OnboardingBanner
              balance={balance}
              licenseConnection={data.developerLicenses}
            />
            <LicenseList licenseConnection={data.developerLicenses} />
            <VehicleSimulatorSection licenseConnection={data.developerLicenses} />
          </>
        )}
      </div>
      <AppListRightPanel />
    </div>
  );
};

export default View;
```

- [ ] **Step 2: Check that LicenseList exports GET_LICENSE_SUMMARIES**

```bash
grep -n "GET_LICENSE_SUMMARIES" src/app/license/list/LicenseList.tsx
grep -n "GET_LICENSE_SUMMARIES" src/app/license/list/index.tsx
```

If `GET_LICENSE_SUMMARIES` is not exported from the list barrel (`src/app/license/list/index.tsx`), add it:

```ts
export { GET_LICENSE_SUMMARIES } from './LicenseList';
```

- [ ] **Step 3: Check that DEVELOPER_LICENSE_SUMMARY_FRAGMENT is exported from LicenseCard**

```bash
grep -n "DEVELOPER_LICENSE_SUMMARY_FRAGMENT" src/components/LicenseCard/index.ts
```

If not exported, add to `src/components/LicenseCard/index.ts`:

```ts
export { DEVELOPER_LICENSE_SUMMARY_FRAGMENT } from './LicenseCard';
```

- [ ] **Step 4: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/app/list/components/View/View.tsx \
        src/app/license/list/index.tsx \
        src/components/LicenseCard/index.ts
git commit -m "feat: wire VehicleSimulator into home page"
```

---

## Manual Verification Checklist

After all tasks are complete, verify end-to-end in the browser:

- [ ] Home page shows "Vehicle Simulator" section below "Your Developer Licenses"
- [ ] Make dropdown lists 5 options (Toyota, Ford, Tesla, BMW, Honda)
- [ ] Selecting a make populates the Model dropdown with 2 options
- [ ] Changing make resets the Model dropdown
- [ ] Year dropdown always shows 2022–2026
- [ ] "Create a simulated vehicle" button is disabled until all three fields are filled
- [ ] Clicking the button shows a loading state
- [ ] After minting, a success notification appears
- [ ] Minted vehicle appears in the list below with Token ID and MMY
- [ ] Multiple vehicles can be minted in the same session and appear in sequence
- [ ] If no license exists, the Vehicle Simulator section is hidden
