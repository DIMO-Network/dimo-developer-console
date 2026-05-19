# Simulated Vehicles Backend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist simulated test vehicles in the API database so ownership is tracked per-user, and update the frontend to POST after mint and GET the stored list instead of querying the chain.

**Architecture:** Add a `simulated_vehicles` table with a SQL migration, wire up a Sequelize model and a pure-DB controller, expose two endpoints under `/api/my/simulated-vehicles` (GET scoped to user+clientId, POST with a server-side max-1 guard), then replace the Apollo GraphQL query in `VehicleSimulator` with a TanStack `useQuery` call against the new server action.

**Tech Stack:** Next.js 14 App Router (API), Sequelize + Postgres, JWT/JWKS auth middleware (API); Next.js App Router (frontend), TanStack Query v5, server actions, axios via `dimoDevAPIClient`.

---

## Chunk 1: API — data layer

### Task 1: SQL migration

**Files:**

- Create: `~/DIMO/dimo-developer-console-api/src/scripts/db/init-db_09.sql`

- [ ] **Step 1: Create the migration file**

```sql
CREATE TABLE IF NOT EXISTS simulated_vehicles (
  id VARCHAR(36) PRIMARY KEY NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  token_id INTEGER NOT NULL,
  make VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  client_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  CONSTRAINT fk_simulated_vehicle_user
    FOREIGN KEY(user_id) REFERENCES users(id)
);
```

- [ ] **Step 2: Apply migration against local dev DB**

Run: `psql $DATABASE_URL -f src/scripts/db/init-db_09.sql`
Expected: `CREATE TABLE`

- [ ] **Step 3: Commit**

```bash
git add src/scripts/db/init-db_09.sql
git commit -m "feat: add simulated_vehicles table migration"
```

---

### Task 2: Sequelize model

**Files:**

- Create: `~/DIMO/dimo-developer-console-api/src/models/simulatedVehicle.model.ts`

- [ ] **Step 1: Create the model**

```typescript
import {
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  Sequelize,
} from 'sequelize';

import DB from '@/services/db';
import { User } from '@/models/user.model';

export class SimulatedVehicle extends Model<
  InferAttributes<SimulatedVehicle>,
  InferCreationAttributes<SimulatedVehicle>
> {
  declare id?: string;
  declare user_id: string;
  declare token_id: number;
  declare make: string;
  declare model: string;
  declare year: number;
  declare client_id: string;
}

SimulatedVehicle.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      validate: { notNull: true },
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      validate: { notNull: true },
    },
    token_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { notNull: true },
    },
    make: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notNull: true },
    },
    model: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notNull: true },
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { notNull: true },
    },
    client_id: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: { notNull: true },
    },
  },
  {
    sequelize: DB.connection as Sequelize,
    modelName: 'SimulatedVehicle',
    tableName: 'simulated_vehicles',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
);

SimulatedVehicle.belongsTo(User, { foreignKey: 'user_id' });
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run compile`
Expected: exit 0, no errors

- [ ] **Step 3: Commit**

```bash
git add src/models/simulatedVehicle.model.ts
git commit -m "feat: add SimulatedVehicle Sequelize model"
```

---

### Task 3: Controller

**Files:**

- Create: `~/DIMO/dimo-developer-console-api/src/controllers/simulatedVehicle.controller.ts`

- [ ] **Step 1: Create the controller**

```typescript
import { SimulatedVehicle } from '@/models/simulatedVehicle.model';

export interface CreateSimulatedVehicleInput {
  user_id: string;
  token_id: number;
  make: string;
  model: string;
  year: number;
  client_id: string;
}

export const getSimulatedVehiclesByUserAndClient = async (
  userId: string,
  clientId: string,
): Promise<SimulatedVehicle[]> => {
  return SimulatedVehicle.findAll({
    where: { user_id: userId, client_id: clientId },
    order: [['created_at', 'ASC']],
  });
};

export const countSimulatedVehiclesByUserAndClient = async (
  userId: string,
  clientId: string,
): Promise<number> => {
  return SimulatedVehicle.count({
    where: { user_id: userId, client_id: clientId },
  });
};

export const createSimulatedVehicle = async (
  input: CreateSimulatedVehicleInput,
): Promise<SimulatedVehicle> => {
  return SimulatedVehicle.create(input);
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run compile`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add src/controllers/simulatedVehicle.controller.ts
git commit -m "feat: add SimulatedVehicle controller"
```

---

## Chunk 2: API — route

### Task 4: Route handler

**Files:**

- Create: `~/DIMO/dimo-developer-console-api/src/app/api/my/simulated-vehicles/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server';
import { AuthenticationMiddleware } from '@/middlewares/authentication.middleware';
import { User } from '@/models/user.model';
import {
  getSimulatedVehiclesByUserAndClient,
  countSimulatedVehiclesByUserAndClient,
  createSimulatedVehicle,
} from '@/controllers/simulatedVehicle.controller';

const MAX_SIMULATED_VEHICLES = 1;

const GET = async (request: NextRequest) => {
  try {
    await AuthenticationMiddleware(request);
    const loggedUser = request.user?.user as User;

    if (!loggedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const clientId = request.nextUrl.searchParams.get('clientId');

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    const vehicles = await getSimulatedVehiclesByUserAndClient(loggedUser.id!, clientId);

    return NextResponse.json({ data: vehicles }, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { message: 'Error fetching simulated vehicles' },
      { status: 500 },
    );
  }
};

const POST = async (request: NextRequest) => {
  try {
    await AuthenticationMiddleware(request);
    const loggedUser = request.user?.user as User;

    if (!loggedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const { token_id, make, model, year, client_id } = body as {
      token_id: number;
      make: string;
      model: string;
      year: number;
      client_id: string;
    };

    if (!token_id || !make || !model || !year || !client_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const existingCount = await countSimulatedVehiclesByUserAndClient(
      loggedUser.id!,
      client_id,
    );

    if (existingCount >= MAX_SIMULATED_VEHICLES) {
      return NextResponse.json(
        { error: 'Simulated vehicle limit reached for this client' },
        { status: 409 },
      );
    }

    const vehicle = await createSimulatedVehicle({
      user_id: loggedUser.id!,
      token_id,
      make,
      model,
      year,
      client_id,
    });

    return NextResponse.json({ data: vehicle }, { status: 201 });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json(
      { message: 'Error creating simulated vehicle' },
      { status: 500 },
    );
  }
};

export { GET, POST };
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run compile`
Expected: exit 0

- [ ] **Step 3: Smoke test with curl (dev server running)**

```bash
# GET without auth — expect 401
curl -s -o /dev/null -w "%{http_code}" \
  http://localhost:3001/api/my/simulated-vehicles?clientId=0x123
# Expected: 401

# POST without auth — expect 401
curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"token_id":1,"make":"Toyota","model":"Camry","year":2022,"client_id":"0x123"}' \
  http://localhost:3001/api/my/simulated-vehicles
# Expected: 401
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/my/simulated-vehicles/route.ts
git commit -m "feat: add simulated-vehicles GET and POST endpoints with max-1 guard"
```

---

## Chunk 3: Frontend — server action and component update

### Task 5: Server action

**Files:**

- Create: `~/DIMO/dimo-developer-console/src/actions/simulatedVehicles.ts`

- [ ] **Step 1: Create the action file**

```typescript
'use server';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export interface SimulatedVehicle {
  id: string;
  user_id: string;
  token_id: number;
  make: string;
  model: string;
  year: number;
  client_id: string;
  created_at: string;
  updated_at: string;
}

export const getSimulatedVehicles = async ({
  clientId,
}: {
  clientId: string;
}): Promise<SimulatedVehicle[]> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<{ data: SimulatedVehicle[] }>(
    `/api/my/simulated-vehicles?clientId=${clientId}`,
  );
  return data.data;
};

export const recordSimulatedVehicle = async ({
  tokenId,
  make,
  model,
  year,
  clientId,
}: {
  tokenId: number;
  make: string;
  model: string;
  year: number;
  clientId: string;
}): Promise<SimulatedVehicle> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<{ data: SimulatedVehicle }>(
    `/api/my/simulated-vehicles`,
    {
      token_id: tokenId,
      make,
      model,
      year,
      client_id: clientId,
    },
  );
  return data.data;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run compile`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add src/actions/simulatedVehicles.ts
git commit -m "feat: add simulatedVehicles server actions"
```

---

### Task 6: Update VehicleSimulator component

**Files:**

- Modify: `~/DIMO/dimo-developer-console/src/app/app/list/components/VehicleSimulator/index.tsx`

Key changes:

1. Remove `useQuery`/`gql` (Apollo), `GET_SIMULATOR_VEHICLES`, `SimulatorVehiclesData`, and the `mintedVehicles` local state.
2. Import `useQuery`/`useQueryClient` from `@tanstack/react-query` and the two new server actions.
3. Drive `atLimit` from `storedVehicles.length` (fetched from API).
4. After successful mint, call `recordSimulatedVehicle` then invalidate the query so the list refetches.
5. Drive the fleet display from `storedVehicles` (use `vehicle.token_id` not `vehicle.tokenId`).

- [ ] **Step 1: Write the updated component**

```typescript
'use client';
import { FC, useContext, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { NotificationContext } from '@/context/notificationContext';
import { useMintVehicle } from '@/hooks';
import { getSimulatedVehicles, recordSimulatedVehicle } from '@/actions/simulatedVehicles';
import { MAKES, YEARS, VehicleMake } from './constants';
import './VehicleSimulator.css';

const MAX_TEST_VEHICLES = 1;

interface Props {
  clientId: `0x${string}`;
}

const MAKE_ABBRS: Record<string, string> = {
  toyota: 'TOY',
  ford: 'FORD',
  tesla: 'TSL',
  bmw: 'BMW',
  honda: 'HON',
};

export const VehicleSimulator: FC<Props> = ({ clientId }) => {
  const { setNotification } = useContext(NotificationContext);
  const mintVehicle = useMintVehicle();
  const queryClient = useQueryClient();

  const [selectedMakeSlug, setSelectedMakeSlug] = useState('');
  const [selectedModelSlug, setSelectedModelSlug] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { data: storedVehicles = [] } = useQuery({
    queryKey: ['simulated-vehicles', clientId],
    queryFn: () => getSimulatedVehicles({ clientId }),
  });

  const atLimit = storedVehicles.length >= MAX_TEST_VEHICLES;

  const selectedMake: VehicleMake | undefined = MAKES.find(
    (m) => m.slug === selectedMakeSlug,
  );
  const canMint =
    !!selectedMakeSlug && !!selectedModelSlug && !!selectedYear && !atLimit;

  const handleMakeChange = (makeSlug: string) => {
    setSelectedMakeSlug(makeSlug);
    setSelectedModelSlug('');
  };

  const selectionPreview = (() => {
    if (!selectedMakeSlug) return 'No vehicle configured';
    const makeName = selectedMake?.label ?? selectedMakeSlug;
    const modelLabel =
      selectedMake?.models.find((m) => m.slug === selectedModelSlug)?.label ??
      selectedModelSlug;
    const parts = [selectedYear, makeName, modelLabel].filter(Boolean);
    return parts.join(' · ');
  })();

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

      await recordSimulatedVehicle({
        tokenId: result.tokenId ?? 0,
        make: selectedMake.label,
        model: modelLabel,
        year: Number(selectedYear),
        clientId,
      });

      await queryClient.invalidateQueries({ queryKey: ['simulated-vehicles', clientId] });

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
    <div className="license-list-content w-full">
      {/* Header */}
      <div className="vehicle-sim-header">
        <div className="vehicle-sim-header-text">
          <p className="title">Vehicle Simulator</p>
          <p className="text-sm text-text-secondary">
            Mint simulated test vehicles on Polygon Amoy.
          </p>
        </div>
      </div>

      {/* Step-by-step configurator */}
      <div className="vehicle-sim-steps">
        {/* Step 01 — Make */}
        <div className="vehicle-sim-step">
          <span className="vehicle-sim-step-label">01 — Make</span>
          <div className="vehicle-sim-make-grid" role="group" aria-label="Select make">
            {MAKES.map((make) => (
              <button
                key={make.slug}
                type="button"
                aria-pressed={selectedMakeSlug === make.slug}
                aria-label={make.label}
                disabled={isLoading}
                onClick={() => handleMakeChange(make.slug)}
                className={`vehicle-sim-make-card${selectedMakeSlug === make.slug ? ' selected' : ''}`}
              >
                <span className="vehicle-sim-make-abbr">
                  {MAKE_ABBRS[make.slug] ?? make.slug.slice(0, 4).toUpperCase()}
                </span>
                <span className="vehicle-sim-make-name">{make.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 02 — Model */}
        <div className={`vehicle-sim-step${!selectedMakeSlug ? ' locked' : ''}`}>
          <span className="vehicle-sim-step-label">02 — Model</span>
          <div className="vehicle-sim-pill-group" role="group" aria-label="Select model">
            {(selectedMake?.models ?? []).map((model) => (
              <button
                key={model.slug}
                type="button"
                aria-pressed={selectedModelSlug === model.slug}
                aria-label={model.label}
                disabled={!selectedMakeSlug || isLoading}
                onClick={() => setSelectedModelSlug(model.slug)}
                className={`vehicle-sim-pill${selectedModelSlug === model.slug ? ' selected' : ''}`}
              >
                {model.label}
              </button>
            ))}
            {!selectedMake && (
              <span
                className="vehicle-sim-pill"
                style={{ opacity: 0.3, pointerEvents: 'none' }}
              >
                Select a make first
              </span>
            )}
          </div>
        </div>

        {/* Step 03 — Year */}
        <div className={`vehicle-sim-step${!selectedModelSlug ? ' locked' : ''}`}>
          <span className="vehicle-sim-step-label">03 — Year</span>
          <div className="vehicle-sim-pill-group" role="group" aria-label="Select year">
            {YEARS.map((year) => (
              <button
                key={year}
                type="button"
                aria-pressed={selectedYear === String(year)}
                aria-label={String(year)}
                disabled={!selectedModelSlug || isLoading}
                onClick={() => setSelectedYear(String(year))}
                className={`vehicle-sim-pill${selectedYear === String(year) ? ' selected' : ''}`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Divider + Mint action */}
      <div className="vehicle-sim-divider" />
      <div className="vehicle-sim-mint-row">
        <span className="vehicle-sim-selection-preview" aria-live="polite">
          {atLimit
            ? `Limit reached — only ${MAX_TEST_VEHICLES} test vehicle per account`
            : selectionPreview}
        </span>
        <Button
          className="white !h-9 shrink-0"
          disabled={!canMint}
          loading={isLoading}
          onClick={handleMint}
        >
          Mint Vehicle
        </Button>
      </div>

      {/* Simulated fleet */}
      {storedVehicles.length > 0 && (
        <div className="vehicle-sim-fleet">
          <div className="vehicle-sim-fleet-header">
            <span className="vehicle-sim-step-label">Simulated Fleet</span>
            <span className="vehicle-sim-fleet-count">
              {storedVehicles.length} vehicle{storedVehicles.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="vehicle-sim-fleet-list">
            {storedVehicles.map((vehicle) => (
              <div key={vehicle.id} className="vehicle-sim-card">
                <div className="vehicle-sim-card-left">
                  <span className="vehicle-sim-card-vehicle">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </span>
                  <span className="vehicle-sim-card-network">Polygon Amoy</span>
                </div>
                <div className="vehicle-sim-card-right">
                  <span className="vehicle-sim-card-token-label">Token ID</span>
                  <span className="vehicle-sim-card-token-id">#{vehicle.token_id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run compile`
Expected: exit 0

- [ ] **Step 3: Commit**

```bash
git add src/app/app/list/components/VehicleSimulator/index.tsx
git commit -m "feat: replace Apollo GraphQL with TanStack Query + API-backed simulated vehicles"
```

---

### Task 7: Update VehicleSimulator tests

**Files:**

- Modify: `~/DIMO/dimo-developer-console/src/app/app/list/components/VehicleSimulator/__tests__/VehicleSimulator.test.tsx`

The existing tests wrap the component in `MockedProvider` and import `GET_SIMULATOR_VEHICLES` — both are gone. Replace with a `QueryClientProvider` wrapper and a `jest.mock` of the server action module.

- [ ] **Step 1: Write the updated test file**

```typescript
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VehicleSimulator } from '../index';
import { NotificationContext } from '@/context/notificationContext';

jest.mock('@/hooks', () => ({
  useMintVehicle: jest.fn(() => jest.fn()),
}));

jest.mock('@/actions/simulatedVehicles', () => ({
  getSimulatedVehicles: jest.fn(),
  recordSimulatedVehicle: jest.fn(),
}));

const { getSimulatedVehicles } = jest.requireMock('@/actions/simulatedVehicles');

const mockSetNotification = jest.fn();
const mockClientId = '0x1234567890123456789012345678901234567890' as `0x${string}`;

const makeStoredVehicle = (overrides = {}) => ({
  id: 'uuid-1',
  user_id: 'user-1',
  token_id: 42,
  make: 'Toyota',
  model: 'Camry',
  year: 2022,
  client_id: mockClientId,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationContext.Provider
        value={{ setNotification: mockSetNotification, notifications: [] }}
      >
        <VehicleSimulator clientId={mockClientId} />
      </NotificationContext.Provider>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  getSimulatedVehicles.mockResolvedValue([]);
});

describe('VehicleSimulator', () => {
  it('renders the section heading', () => {
    renderComponent();
    expect(screen.getByText('Vehicle Simulator')).toBeInTheDocument();
  });

  it('renders make selector buttons', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: 'Toyota' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ford' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tesla' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'BMW' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Honda' })).toBeInTheDocument();
  });

  it('disables the mint button until all fields are selected', () => {
    renderComponent();
    expect(screen.getByRole('button', { name: /mint vehicle/i })).toBeDisabled();
  });

  it('enables the mint button when make, model, and year are all selected', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Camry' }));
    fireEvent.click(screen.getByRole('button', { name: '2022' }));
    expect(screen.getByRole('button', { name: /mint vehicle/i })).not.toBeDisabled();
  });

  it('resets selected model when make changes', () => {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Camry' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ford' }));
    expect(screen.getByRole('button', { name: /mint vehicle/i })).toBeDisabled();
  });

  it('disables mint and shows limit message when stored vehicle count is at limit', async () => {
    getSimulatedVehicles.mockResolvedValue([makeStoredVehicle()]);
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/limit reached/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Toyota' }));
    fireEvent.click(screen.getByRole('button', { name: 'Camry' }));
    fireEvent.click(screen.getByRole('button', { name: '2022' }));
    expect(screen.getByRole('button', { name: /mint vehicle/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm test -- --testPathPattern=VehicleSimulator`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add src/app/app/list/components/VehicleSimulator/__tests__/VehicleSimulator.test.tsx
git commit -m "test: update VehicleSimulator tests to use mocked server actions"
```

---

## Chunk 4: Final verification

### Task 8: Full test run and build check

- [ ] **Step 1: Run all frontend tests**

Run: `npm test`
Expected: all tests pass

- [ ] **Step 2: Run TypeScript typecheck (frontend)**

Run: `npm run compile`
Expected: exit 0

- [ ] **Step 3: Run linter**

Run: `npm run lint`
Expected: exit 0

- [ ] **Step 4: Run TypeScript typecheck (API)**

In `~/DIMO/dimo-developer-console-api`:
Run: `npm run compile` (or `npx tsc --noEmit`)
Expected: exit 0
