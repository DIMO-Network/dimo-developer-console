# dimo-developer-console

Next.js developer console app. Powers console.dimo.org — manages developer licenses and integrations within the DIMO ecosystem.

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS
- Apollo Client (GraphQL), TanStack Query, TanStack Table
- Auth: Google + GitHub OAuth via NextAuth
- Wallet/crypto: Turnkey, ZeroDev, web3
- Testing: Jest + React Testing Library
- Error tracking: Sentry

## Key Commands

```
npm run dev        # start dev server (requires .env.local)
npm test           # run Jest tests
npm run test:update-snap  # update snapshots
npm run lint       # ESLint
npm run lint:format  # Prettier check
npm run build      # production build
npm run compile    # TypeScript typecheck only
```

## Project Structure

```
src/
  app/         # Next.js App Router pages and API routes
  components/  # Reusable UI components
  services/    # API service layers
  hooks/       # Custom React hooks
  context/     # React context providers
  gql/         # GraphQL queries/mutations (codegen'd types)
  types/       # Shared TypeScript types
  utils/       # Utilities and helpers
  config/      # App configuration
  contracts/   # Smart contract ABIs/addresses
```

## Local Setup

- Requires `.env.local` — see README for all required env vars (Turnkey, ZeroDev, OAuth credentials)
- Depends on dimo-developer-console-api running locally for full functionality
- GraphQL codegen: `npm run compile` regenerates types from schema

## Testing

- Tests live in `__tests__/`
- Always run `npm test` before committing
- Update snapshots intentionally with `npm run test:update-snap`

## Deployment

- Hosted on Vercel — deploys on merge to main
- Sentry is configured for all environments (client, server, edge)

## Gotchas

- App Router only — no Pages Router
- Wallet interactions require browser environment; don't SSR crypto logic
- GraphQL types are auto-generated — edit `.graphql` files, not generated output
