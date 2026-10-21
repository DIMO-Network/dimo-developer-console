// ready: text that only appears once the main content has rendered (checked
// first). fill {selector: value} then click (selector or list) set up a state;
// after: text awaited once they are done. viewports limits a state to one size.
// noLicenses: identity returns no developer licenses (the empty /licenses state).
// notShared: identity's vehicle has no SACD for a harness license, and /api/data/*
// answers 403 NOT_SHARED (the vehicle page's not-shared state).
// dataErrors: data API operation names answered 200 with data: null and a
// privilege error (fixtures DATA_ERRORS), like gqlgen refusing a privilege.
// hover: a selector the pointer rests on for the shot (hover states).
// team: active_team cookie (fixtures teamsFor: team-acme = member of Acme
// Mobility, team-empty = owner alone, team-down = /api/my/teams answers 500).
// inviteToken: a pending invite cookie.
// memberSigner: Identity lists the harness wallet on Harness Fleet. memberJwt:
// a member developer JWT in this browser. dataNoAccess: /api/data/* answers the
// proxy's NO_ACCESS for a member whose wallet is still listed. /api/data/* is
// mocked in the browser, so the data proxy itself is tested in Jest only.
// knownConsoleWarning: { pattern, reason } for a console error reproducible on
// untouched master. Matching messages are logged as "known warning" and excluded
// (the dev badge's issue count is excused only up to the number matched);
// hydration mismatches, other errors and overlay dialogs still fail the shot.
// On master: /app and /settings mismatch on the Suspense hydration (3 of 3 runs,
// light mobile); the webhook form logs a React controlled-input warning.
import { LICENSE, CONNECTIONS, WEBHOOKS, WALLET, SIGNER } from './fixtures.mjs';

// Both pages wrap their view in <Suspense>, which can hydrate after the header's
// useUser() query has resolved; the view then renders user data the server
// rendered without. Timing-dependent; reproduced on untouched master. The pattern
// pins the known diff (the waving-hand img / the UserDetails card).
const APP_HYDRATION = {
  pattern: /Hydration failed[\s\S]*waving-hand/,
  reason: 'welcome row: BubbleLoader on server, waving-hand img on client',
};
const SETTINGS_HYDRATION = {
  pattern: /Hydration failed because the server rendered text didn't match/,
  reason: 'UserDetails: null on server, user card on client',
};
// React warning for a form field with value but no onChange (webhook form).
const WEBHOOK_FORM_WARNING = {
  pattern: /You provided a `value` prop to a form field without an `onChange` handler/,
  reason: 'form field with value but no onChange',
};

const t = LICENSE.tokenId;
const c = LICENSE.clientId;

export const ROUTES = [
  // Home is a shortcut grid on master; licenses live at /licenses.
  {
    name: 'app',
    path: '/app',
    ready: 'Welcome',
    knownConsoleWarning: APP_HYDRATION,
  },
  {
    name: 'app-mobile-menu',
    path: '/app',
    ready: 'Welcome',
    click: '[aria-label="Open menu"]',
    viewports: ['mobile'],
    knownConsoleWarning: APP_HYDRATION,
  },
  // Collapsed sidebar: click the collapse button (persists to localStorage).
  {
    name: 'app-collapsed',
    path: '/app',
    ready: 'Welcome',
    click: '[aria-label="Collapse sidebar"]',
    viewports: ['desktop'],
    knownConsoleWarning: APP_HYDRATION,
  },
  // No add-credits state: master has that button commented out.
  {
    name: 'app-account-info-modal',
    path: '/app',
    ready: 'Welcome',
    click: '[title="Account Information"]',
    after: 'Account information',
    knownConsoleWarning: APP_HYDRATION,
  },
  { name: 'licenses', path: '/licenses', ready: LICENSE.alias },
  {
    name: 'licenses-empty',
    path: '/licenses',
    ready: "You haven't created any developer licenses yet",
    noLicenses: true,
  },
  {
    name: 'licenses-create-modal',
    path: '/licenses',
    ready: "You haven't created any developer licenses yet",
    noLicenses: true,
    click: 'text=Create a license',
    after: 'Create a license',
  },
  {
    // A success toast (Sonner) from the license card's vehicle sharing link copy.
    name: 'licenses-toast',
    path: '/licenses',
    ready: LICENSE.alias,
    // Only the second license has a single configuration, hence a copy link.
    click: 'text="Vehicle sharing link"',
    after: 'Sharing link copied',
    viewports: ['desktop'],
  },
  // License details: four client-side tabs (Overview is the default).
  { name: 'license-details', path: `/license/${t}/details`, ready: LICENSE.alias },
  {
    name: 'license-details-config',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: 'role=tab[name="Config"]',
    after: 'Authorized redirect URIs',
  },
  {
    name: 'license-details-vehicles',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: 'role=tab[name="Vehicles"]',
    after: 'Connected vehicles',
  },
  {
    name: 'license-details-brand',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: 'role=tab[name="Brand"]',
  },
  {
    // Brand tab, then start a new brand so the create form renders.
    name: 'license-details-brand-form',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: ['role=tab[name="Brand"]', 'text="Add brand"'],
    after: 'Display name',
  },
  {
    name: 'license-workspace-name-modal',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: 'button[title="Rename"]',
    after: 'Edit developer license name',
  },
  {
    // Vehicles tab, then the vehicle simulator modal.
    name: 'license-vehicle-simulator',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: ['role=tab[name="Vehicles"]', 'text="Vehicle simulator"'],
    viewports: ['desktop'],
  },
  {
    // Vehicle simulator with a region and a make chosen (toggled tiles).
    name: 'license-vehicle-simulator-selected',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: [
      'role=tab[name="Vehicles"]',
      'text="Vehicle simulator"',
      '.vehicle-sim-region-card',
      '.vehicle-sim-make-card',
      '.vehicle-sim-pill',
    ],
    viewports: ['desktop'],
  },
  // Configurator: list, then the split-panel form with the live preview.
  {
    name: 'license-configurator',
    path: `/license/${t}/configurator`,
    ready: 'Login with DIMO configurator',
    after: 'Copy link',
  },
  {
    name: 'license-configurator-new',
    path: `/license/${t}/configurator/new`,
    ready: 'Basics',
  },
  {
    // Custom permissions with one card selected and the date picker on a day.
    name: 'license-configurator-new-selected',
    path: `/license/${t}/configurator/new`,
    ready: 'Basics',
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
    // One permission card selected, the pointer on an unselected one.
    name: 'license-configurator-new-hover',
    path: `/license/${t}/configurator/new`,
    ready: 'Basics',
    click: ['text="Custom permissions"', 'text="Commands"'],
    hover: 'div[role="button"][aria-pressed="false"]',
    viewports: ['desktop'],
  },
  {
    // A success toast (Sonner) from the configuration list's Copy link.
    name: 'license-configurator-toast',
    path: `/license/${t}/configurator`,
    ready: 'Login with DIMO configurator',
    after: 'Copy link',
    click: 'text="Copy link"',
    viewports: ['desktop'],
  },
  {
    name: 'license-configurator-edit',
    path: `/license/${t}/configurator/cfg-1`,
    ready: 'Configuration name',
  },
  { name: 'license-vehicles', path: `/license/vehicles/${c}`, ready: 'Model 3' },
  {
    // Row actions menu, then the Renounce modal (confirm is not clicked).
    name: 'license-vehicles-renounce-modal',
    path: `/license/vehicles/${c}`,
    ready: 'Model 3',
    click: ['[aria-label="Row actions"]', 'text="Renounce access"'],
    after: 'Renounce vehicle access?',
  },
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
    knownConsoleWarning: WEBHOOK_FORM_WARNING,
  },
  {
    name: 'webhook-edit',
    path: `/webhooks/edit/${c}/${WEBHOOKS[0].id}`,
    ready: 'valueNumber > 120',
    knownConsoleWarning: WEBHOOK_FORM_WARNING,
  },
  {
    name: 'webhooks-expanded',
    path: '/webhooks',
    ready: WEBHOOKS[0].displayName,
    click: 'text="Speeding alert"',
    after: 'Webhook URL',
    viewports: ['mobile'],
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
  { name: 'vehicles', path: `/vehicles?license=${c}`, ready: 'Model 3' },
  {
    name: 'vehicle-summary',
    path: `/vehicles/190231?license=${c}`,
    ready: 'Available signals',
  },
  {
    name: 'vehicle-device',
    path: `/vehicles/190231?license=${c}&subject=did:erc721:80002:0x9c94C395cBcBDe662235E0A9d3bB87Ad708561BA:490231`,
    ready: 'Latest payload',
  },
  {
    name: 'vehicle-raw',
    path: `/vehicles/190231?license=${c}&tab=raw`,
    ready: 'cloud events',
    click: 'button:has-text("dimo.fingerprint")',
    after: 'JTMW1RFV8PD000000',
  },
  {
    // A device is read through the vehicle DID with its producer locked.
    name: 'vehicle-raw-device',
    path: `/vehicles/190231?license=${c}&subject=did:erc721:80002:0x9c94C395cBcBDe662235E0A9d3bB87Ad708561BA:490231&tab=raw`,
    ready: 'Producer: AutoPi',
    after: 'cloud events',
  },
  {
    name: 'vehicle-signals',
    path: `/vehicles/190231?license=${c}&tab=signals`,
    ready: 'Add signal',
    click: [
      'button:has-text("Add signal")',
      'label:has-text("Speed") input',
      'button:has-text("Add signal")',
      'button:has-text("Run query")',
    ],
    after: 'points',
    viewports: ['desktop'],
  },
  {
    name: 'vehicle-trips',
    path: `/vehicles/190231?license=${c}&tab=trips`,
    ready: 'Detect trips by',
    click: 'button:has-text("Run query")',
    after: 'In progress',
  },
  {
    // Segments answers like a missing VEHICLE_ALL_TIME_LOCATION privilege.
    name: 'vehicle-trips-no-privilege',
    path: `/vehicles/190231?license=${c}&tab=trips`,
    ready: 'Detect trips by',
    click: 'button:has-text("Run query")',
    after: 'requires privilege VEHICLE_ALL_TIME_LOCATION',
    dataErrors: ['Segments'],
  },
  {
    name: 'vehicle-documents',
    path: `/vehicles/190231?license=${c}&subject=did:ethr:80002:${WALLET}`,
    ready: "Driver's license",
  },
  {
    name: 'vehicle-sharing',
    path: `/vehicles/190231?license=${c}&subject=sharing`,
    ready: 'View terms',
  },
  {
    // Identity's SACDs name neither harness license: no license can read it.
    name: 'vehicle-not-shared',
    path: `/vehicles/190231?license=${c}`,
    ready: "This vehicle isn't shared with any of your licenses",
    notShared: true,
  },
  {
    name: 'settings',
    path: '/settings',
    ready: 'jane@harness.dev',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-support-modal',
    path: '/settings',
    ready: 'jane@harness.dev',
    click: 'text=Developer support',
    after: 'Contact developer support',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-team-empty',
    path: '/settings',
    ready: 'Invite teammates to share',
    team: 'team-empty',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-team-member',
    path: '/settings',
    ready: 'Leave team',
    team: 'team-acme',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-invite-modal',
    path: '/settings',
    ready: 'Sam Rivera',
    click: 'text="Invite member"',
    after: 'Invite a team member',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    // The ⋯ menu must fit a 390px phone (DESIGN.md, Table).
    name: 'settings-member-menu',
    path: '/settings',
    ready: 'Sam Rivera',
    click: '[aria-label="Actions for ana@harness.dev"]',
    after: 'Cancel invite',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-grant-modal',
    path: '/settings',
    ready: 'Max Chen joined. Grant data access?',
    click: 'text="Grant"',
    after: 'Grant Max Chen data access',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'settings-remove-modal',
    path: '/settings',
    ready: 'Sam Rivera',
    click: ['[aria-label="Actions for sam@harness.dev"]', 'text="Remove"'],
    after: 'Created by them',
    knownConsoleWarning: SETTINGS_HYDRATION,
  },
  {
    name: 'app-team-switcher',
    path: '/app',
    ready: 'Welcome',
    team: 'team-acme',
    click: '[aria-haspopup="listbox"]',
    after: 'Harness Motors',
    viewports: ['desktop'],
    knownConsoleWarning: APP_HYDRATION,
  },
  {
    // Review Focus 1: console-api can't list teams; owners keep their licenses.
    name: 'licenses-teams-unavailable',
    path: '/licenses',
    ready: LICENSE.alias,
    team: 'team-down',
    after: "Couldn't load your teams",
  },
  {
    name: 'app-pending-invite',
    path: '/app',
    ready: 'Join Acme Mobility owned by ops@acme.dev?',
    inviteToken: true,
    knownConsoleWarning: APP_HYDRATION,
  },
  {
    name: 'license-details-assign-key',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    // The API keys table is on the Config tab.
    click: [
      'role=tab[name="Config"]',
      `[aria-label="Actions for ${SIGNER}"]`,
      'text="Assign"',
    ],
    after: 'Who is this key for?',
  },
  {
    name: 'vehicle-member',
    path: `/vehicles/190231?license=${c}`,
    ready: 'Available signals',
    team: 'team-acme',
    memberSigner: true,
    memberJwt: true,
  },
  {
    name: 'vehicle-member-connect',
    path: `/vehicles/190231?license=${c}`,
    ready: 'Connect your wallet to read this vehicle',
    team: 'team-acme',
    memberSigner: true,
  },
  {
    name: 'vehicle-member-no-access',
    path: `/vehicles/190231?license=${c}`,
    ready: 'Ask ops@acme.dev for data access to Harness Fleet.',
    team: 'team-acme',
  },
  {
    name: 'vehicle-member-reconnect',
    path: `/vehicles/190231?license=${c}`,
    ready: 'Reconnect to Harness Fleet',
    team: 'team-acme',
    memberSigner: true,
    memberJwt: true,
    dataNoAccess: true,
  },
  {
    name: 'vehicles-member-empty',
    path: '/vehicles',
    ready: 'This team has no developer licenses yet.',
    team: 'team-acme',
    noLicenses: true,
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
    // An option card selected.
    name: 'sign-up-build-for-selected',
    path: '/sign-up?flow=build-for',
    ready: 'What are you building?',
    click: 'text="Web application"',
    guest: true,
  },
  {
    // One card selected, the pointer on another.
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
    // An unmatched path renders src/app/not-found.tsx (and must not
    // redirect-loop).
    name: 'not-found',
    path: '/this-does-not-exist',
    ready: 'Page not found',
  },
];
