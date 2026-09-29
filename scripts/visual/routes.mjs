// ready: text that only appears once the main content has rendered (checked
// first). fill {selector: value} then click (selector or list) set up a state;
// after: text awaited once they are done. viewports limits a state to one size.
// noLicenses: identity returns no developer licenses (the empty /licenses state).
// hover: a selector the pointer rests on for the shot (hover states).
// knownConsoleWarning: { pattern, reason } for a console error reproducible on
// untouched master. Matching messages are logged as "known warning" and excluded
// (the dev badge's issue count is excused only up to the number matched);
// hydration mismatches, other errors and overlay dialogs still fail the shot.
// On master: /app and /settings mismatch on the Suspense hydration (3 of 3 runs,
// light mobile); the webhook form logs a React controlled-input warning.
import { LICENSE, CONNECTIONS, WEBHOOKS } from './fixtures.mjs';

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
    // The MenuButton has no aria-label on master; match its size class.
    click: 'button.size-12',
    viewports: ['mobile'],
    knownConsoleWarning: APP_HYDRATION,
  },
  // No add-credits state: master has that button commented out.
  {
    name: 'app-account-info-modal',
    path: '/app',
    ready: 'Welcome',
    click: '[title="Account Information"]',
    after: 'Account Information',
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
    // A success toast (Sonner) from the license card's Vehicle Sharing Link copy.
    name: 'licenses-toast',
    path: '/licenses',
    ready: LICENSE.alias,
    // Only the second license has a single configuration, hence a copy link.
    click: 'text="Vehicle Sharing Link"',
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
    after: 'Connected Vehicles',
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
    click: ['role=tab[name="Brand"]', 'text="Add Brand"'],
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
    // Vehicles tab, then the Vehicle Simulator modal.
    name: 'license-vehicle-simulator',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: ['role=tab[name="Vehicles"]', 'text="Vehicle Simulator"'],
    viewports: ['desktop'],
  },
  {
    // Vehicle simulator with a region and a make chosen (toggled tiles).
    name: 'license-vehicle-simulator-selected',
    path: `/license/${t}/details`,
    ready: LICENSE.alias,
    click: [
      'role=tab[name="Vehicles"]',
      'text="Vehicle Simulator"',
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
    ready: 'Login With DIMO Configurator',
    after: 'Copy Link',
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
      'text="Custom Permissions"',
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
    click: ['text="Custom Permissions"', 'text="Commands"'],
    hover: 'div.cursor-pointer.rounded-md.border:not(.ring-1)',
    viewports: ['desktop'],
  },
  {
    // A success toast (Sonner) from the configuration list's Copy Link.
    name: 'license-configurator-toast',
    path: `/license/${t}/configurator`,
    ready: 'Login With DIMO Configurator',
    after: 'Copy Link',
    click: 'text="Copy Link"',
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
    click: 'text="Purchase Connection License"',
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
  { name: 'explorer-vehicle', path: '/explorer/190231', ready: 'Available Signals' },
  {
    // The selected vehicle row with the pointer on another.
    name: 'explorer-vehicle-hover',
    path: '/explorer/190231',
    ready: 'Available Signals',
    hover: 'button:has-text("Token #"):not(.bg-primary)',
    viewports: ['desktop'],
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
    click: 'text="Web Application"',
    guest: true,
  },
  {
    // One card selected, the pointer on another.
    name: 'sign-up-build-for-hover',
    path: '/sign-up?flow=build-for',
    ready: 'What are you building?',
    click: 'text="Web Application"',
    hover: '.card-border.cursor-pointer:not([class~="!border-white"])',
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
    // serves its own built-in 404 here (src/app/_not-found.tsx isn't wired up:
    // the App Router only recognizes a file literally named not-found.tsx).
    name: 'not-found',
    path: '/this-does-not-exist',
    ready: 'This page could not be found',
  },
];
