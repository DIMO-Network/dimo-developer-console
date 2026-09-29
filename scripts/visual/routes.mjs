// ready: text that only appears once the main content has rendered (checked
// first). fill {selector: value} then click (selector or list) set up a state;
// after: text awaited once they are done. viewports limits a state to one size.
// noLicenses: identity returns no developer licenses (the empty /app state).
// hover: a selector the pointer rests on for the shot (hover states).
// knownHydrationError: a mismatch already present on the untouched baseline;
// it (and the dev badge's issue count) is logged instead of failing the shot.
import { LICENSE, CONNECTIONS, WEBHOOKS } from './fixtures.mjs';

// Both pages wrap their view in <Suspense>, which can hydrate after the header's
// useUser() query has resolved; the view then renders user data the server
// rendered without. Intermittent, and present before any styling work.
const APP_HYDRATION = 'welcome row: BubbleLoader on server, waving-hand img on client';
const SETTINGS_HYDRATION = 'UserDetails: null on server, user card on client';

const t = LICENSE.tokenId;
const c = LICENSE.clientId;

export const ROUTES = [
  {
    name: 'app',
    path: '/app',
    ready: LICENSE.alias,
    knownHydrationError: APP_HYDRATION,
  },
  {
    name: 'app-create-modal',
    path: '/app',
    ready: 'Create a license',
    noLicenses: true,
    click: 'text=Create a license',
    knownHydrationError: APP_HYDRATION,
  },
  {
    name: 'app-empty',
    path: '/app',
    ready: 'Use your developer license credentials',
    noLicenses: true,
    knownHydrationError: APP_HYDRATION,
  },
  {
    name: 'app-mobile-menu',
    path: '/app',
    ready: LICENSE.alias,
    click: '[aria-label="Open menu"]',
    viewports: ['mobile'],
    knownHydrationError: APP_HYDRATION,
  },
  {
    name: 'app-add-credits-modal',
    path: '/app',
    ready: LICENSE.alias,
    click: '[role="add-credits"]',
    after: 'Buy DCX',
    knownHydrationError: APP_HYDRATION,
  },
  {
    name: 'app-account-info-modal',
    path: '/app',
    ready: LICENSE.alias,
    click: '[title="Account Information"]',
    after: 'Account information',
    knownHydrationError: APP_HYDRATION,
  },
  {
    name: 'license-details',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    // Open every collapsible section so signers, JWTs, URIs and brands show.
    click: [
      'text="Developer JWTs"',
      'text="API keys"',
      'text="Authorized redirect URIs"',
      'text="Brand"',
    ],
  },
  {
    name: 'license-details-brand-form',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    // Open Brand then start a new brand so the create form (name, image pickers,
    // primary color) renders.
    click: ['text="Brand"', 'text="Add brand"'],
    after: 'Display name',
  },
  {
    name: 'license-workspace-name-modal',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    // The pencil icon next to the license alias opens WorkspaceNameModal; Brand
    // isn't expanded here so its own edit pencil isn't in the DOM to collide.
    click: 'svg.cursor-pointer',
    after: 'Edit developer license name',
  },
  {
    name: 'license-configurator',
    path: `/license/${t}/configurator`,
    ready: 'Fleet onboarding',
  },
  {
    name: 'license-configurator-new',
    path: `/license/${t}/configurator/new`,
    ready: 'Which component?',
  },
  {
    // Selection states: a permission card toggled on (selected card: ink edge)
    // and the date picker reopened on a chosen day (toggled control: inverse ink).
    name: 'license-configurator-new-selected',
    path: `/license/${t}/configurator/new`,
    ready: 'Which component?',
    click: [
      'text="Custom permissions"',
      'text="Commands"',
      '.date-picker .text-field',
      '.date-picker .grid >> text="15"',
      '.date-picker .text-field',
    ],
    viewports: ['desktop'],
  },
  {
    // Permission cards: one selected (control + ink edge), the pointer on an
    // unselected one (a lighter half step; never the selected fill).
    name: 'license-configurator-new-hover',
    path: `/license/${t}/configurator/new`,
    ready: 'Which component?',
    click: ['text="Custom permissions"', 'text="Commands"'],
    hover: '[role="button"][aria-pressed="false"]',
    viewports: ['desktop'],
  },
  {
    // A success toast (icon + message) from the configuration list's Copy link.
    name: 'license-configurator-toast',
    path: `/license/${t}/configurator`,
    ready: 'Fleet onboarding',
    click: 'text="Copy link"',
    after: 'Sharing link copied',
    viewports: ['desktop'],
  },
  {
    // Vehicle simulator with a region and a make chosen (toggled tiles).
    name: 'license-vehicle-simulator-selected',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: [
      'text="Vehicle simulator"',
      '.vehicle-sim-region-card',
      '.vehicle-sim-make-card',
      '.vehicle-sim-pill',
    ],
    viewports: ['desktop'],
  },
  {
    name: 'license-configurator-edit',
    path: `/license/${t}/configurator/cfg-1`,
    ready: 'Use Permission Template',
  },
  { name: 'license-vehicles', path: `/license/vehicles/${c}`, ready: 'Model 3' },
  { name: 'connections', path: '/connections', ready: CONNECTIONS[0].name },
  {
    name: 'connection-details',
    path: `/connections/${CONNECTIONS[0].id}`,
    ready: CONNECTIONS[0].name,
  },
  {
    name: 'connection-create',
    path: '/connections/create/0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
    ready: 'Purchase connection license',
  },
  {
    name: 'connection-create-confirm',
    path: '/connections/create/0x9f1e2d3c4b5a69788796a5b4c3d2e1f0a9b8c7d6',
    ready: 'Purchase connection license',
    click: 'text="Purchase connection license"',
    after: 'Continue with payment',
  },
  { name: 'webhooks', path: '/webhooks', ready: WEBHOOKS[0].displayName },
  {
    name: 'webhook-create',
    path: `/webhooks/create/${c}`,
    ready: 'Build the conditions',
  },
  {
    name: 'webhook-edit',
    path: `/webhooks/edit/${c}/${WEBHOOKS[0].id}`,
    ready: 'valueNumber > 120',
  },
  {
    name: 'webhook-delete-modal',
    path: '/webhooks',
    ready: WEBHOOKS[0].displayName,
    click: ['text="Speeding alert"', 'text="Delete"'],
    after: 'Are you sure you want to delete this webhook?',
  },
  {
    name: 'templates',
    path: '/templates',
    ready: 'Search',
    fill: {
      'input[placeholder="Toyota"]': 'Toyota',
      'input[placeholder="Camry"]': 'Camry',
    },
    click: 'button:has-text("Search")',
    after: 'toyota_camry_2021',
  },
  { name: 'template-edit', path: '/templates/toyota_camry_2020', ready: 'Camry' },
  { name: 'template-new', path: '/templates/new', ready: 'Create template' },
  { name: 'explorer', path: '/explorer', ready: 'Model 3' },
  { name: 'explorer-vehicle', path: '/explorer/190231', ready: 'Available signals' },
  {
    // The selected vehicle row (control + ink edge) with the pointer on another.
    name: 'explorer-vehicle-hover',
    path: '/explorer/190231',
    ready: 'Available signals',
    hover: 'button:has-text("Token #"):not([aria-current])',
    viewports: ['desktop'],
  },
  {
    name: 'settings',
    path: '/settings',
    ready: 'sam@harness.dev',
    knownHydrationError: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-support-modal',
    path: '/settings',
    ready: 'sam@harness.dev',
    click: 'text=Developer support',
    after: 'Contact developer support',
    knownHydrationError: SETTINGS_HYDRATION,
  },
  { name: 'support', path: '/support', ready: 'Report an issue' },
  { name: 'sign-in', path: '/sign-in', ready: 'Build with car data', guest: true },
  { name: 'sign-up', path: '/sign-up', ready: 'Creating account with', guest: true },
  {
    name: 'sign-up-build-for',
    path: '/sign-up?flow=build-for',
    ready: 'What are you building?',
    guest: true,
  },
  {
    // An option card selected (selected card: neutral fill + ink edge).
    name: 'sign-up-build-for-selected',
    path: '/sign-up?flow=build-for',
    ready: 'What are you building?',
    click: 'text="Web application"',
    guest: true,
  },
  {
    // One card selected, the pointer on another (hover is a lighter step).
    name: 'sign-up-build-for-hover',
    path: '/sign-up?flow=build-for',
    ready: 'What are you building?',
    click: 'text="Web application"',
    hover: '[role="radio"][aria-checked="false"]',
    guest: true,
  },
  {
    name: 'email-recovery',
    path: '/email-recovery',
    ready: 'Reset passkeys',
    guest: true,
  },
  {
    name: 'sign-up-company-information',
    path: '/sign-up?flow=company-information',
    ready: 'Final stretch',
    guest: true,
  },
  {
    // Confirms an unmatched authenticated path doesn't redirect-loop. Next.js
    // serves its own built-in 404 here (not src/app/_not-found.tsx, which
    // isn't wired up: the App Router only recognizes a file literally named
    // not-found.tsx, and this one keeps its leading underscore) — see the
    // pass-15 report for detail. Nothing here reflects this repo's styling.
    name: 'not-found',
    path: '/this-does-not-exist',
    ready: 'This page could not be found',
  },
];
