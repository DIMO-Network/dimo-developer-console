import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { getTranslations } from 'next-intl/server';
import { AREAS } from '@/i18n/messages';
import { bottomMenu, getNavSections, getPageTitle } from '@/config/navigation';
import { conditionsConfig, eventNamesByService } from '@/utils/webhook';
import { INVITE_ERROR_KEYS, inviteErrorKey } from '@/utils/inviteErrors';
import { LICENSE_ALIAS_TOO_LONG_KEY } from '@/utils/licenseAlias';
import { ERROR_KEYS } from '@/hooks/useErrorHandler';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { UserOperationFailedError } from '@/utils/userOperation';
import { humanizeSignal, NAMED_SIGNALS } from '@/utils/humanizeSignal';
import { PERMISSION_NAMES, permissionLabels } from '@/utils/sacdPermissions';
import { WEEKDAY_KEYS } from '@/components/DatePicker/DatePicker';
import { PRESETS, type RangePreset } from '@/components/TimeRangePicker/TimeRangePicker';
import type { OwnerOnlyFeature } from '@/components/OwnerOnly';
import type { EntitlementKind } from '@/services/templateEntitlement';
import { entitlementReasonText, type EntitlementReason } from '@/utils/entitlementReason';
import {
  subjectLabel,
  subjectSublabel,
  type Subject,
  type SubjectDetailKey,
  type SubjectKind,
} from '@/services/subjects/graph';
import type { TeamRole } from '@/types/team';
import { TEXT_KEYS } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable/constants';

// A typo in a key renders the raw key in production, so every key the code can
// ask for must exist in messages/en. Literal keys are found by scanning the
// source; keys built at runtime come from the tables below. The Record types
// make the compiler list every member of a union, so a new one is checked too.

const ROOT = join(__dirname, '..', '..', '..');
const messages: Record<string, unknown> = Object.fromEntries(
  AREAS.map((area) => [
    area,
    JSON.parse(readFileSync(join(ROOT, 'messages', 'en', `${area}.json`), 'utf8')),
  ]),
);

const has = (area: string, key: string): boolean =>
  typeof key.split('.').reduce<unknown>((node, part) => {
    return node && typeof node === 'object'
      ? (node as Record<string, unknown>)[part]
      : undefined;
  }, messages[area]) === 'string';

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === '__tests__' || name === '__fixtures__' ? [] : sourceFiles(path);
    }
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });

const BINDING =
  /\bconst\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*'([\w-]+)'\s*\)/g;

// Every literal `t('key')`, `t.rich('key')` and `t.markup('key')`, for each
// translator a file binds, checked against that translator's area. A name bound
// to different areas in one file accepts a key from any of them.
const literalKeys = sourceFiles(join(ROOT, 'src')).flatMap((file) => {
  const source = readFileSync(file, 'utf8');
  const areasByName = new Map<string, Set<string>>();
  for (const [, name, area] of source.matchAll(BINDING)) {
    areasByName.set(name, (areasByName.get(name) ?? new Set()).add(area));
  }
  return [...areasByName].flatMap(([name, areas]) =>
    [
      ...source.matchAll(
        new RegExp(`\\b${name}(?:\\.rich|\\.markup)?\\(\\s*'([A-Za-z0-9_.-]+)'`, 'g'),
      ),
    ].map((match) => [file.slice(ROOT.length), [...areas].join('|'), match[1]] as const),
  );
});

describe('literal message keys', () => {
  it('finds the literal keys the code asks for', () => {
    expect(literalKeys.length).toBeGreaterThan(1000);
  });

  it.each(literalKeys)(
    '%s asks %s for a message that exists: %s',
    (_file, areas, key) => {
      expect(areas.split('|').some((area) => has(area, key))).toBe(true);
    },
  );
});

const common = (keys: string[]) => keys.map((key) => [key] as const);

const ROLES: Record<TeamRole, true> = { OWNER: true, MEMBER: true };
const WEBHOOK_STATUSES = ['enabled', 'disabled', 'failed'];
const PRESET_KEYS: Record<RangePreset, true> = {
  '24h': true,
  '7d': true,
  '30d': true,
  'custom': true,
};
const ENTITLEMENT_KINDS: Record<EntitlementKind, true> = {
  'create': true,
  'licensed': true,
  'manufacturer': true,
  'curator': true,
  'license-required': true,
  'unavailable': true,
};
const OWNER_ONLY: Record<OwnerOnlyFeature, true> = {
  webhooks: true,
  connections: true,
  configurations: true,
};

describe('common keys from tables', () => {
  const navItems = [
    ...getNavSections(true, { isMember: true, dataAccessEnabled: true }),
    ...getNavSections(true),
  ].flatMap((section) => [
    section.labelKey,
    ...section.items.map((item) => item.labelKey),
  ]);
  const pagePaths = [
    '/',
    '/app',
    '/licenses',
    '/webhooks',
    '/templates',
    '/connections',
    '/settings',
    '/vehicles',
    '/support',
    '/vehicles/1',
    '/license/1/details',
    '/license/1/configurator',
    '/license/vehicles/abc',
    '/webhooks/create/abc',
    '/webhooks/edit/abc/def',
    '/connections/create/abc',
    '/connections/abc',
    '/templates/new',
    '/templates/abc',
  ];

  it.each(
    common([
      ...navItems,
      ...bottomMenu.map((item) => item.labelKey),
      ...pagePaths.map((path) => getPageTitle(path) ?? `no title for ${path}`),
      ...conditionsConfig.map((c) => c.labelKey),
      ...Object.values(eventNamesByService).flatMap((events) =>
        events.map((e) => e.labelKey),
      ),
      ...Object.values(INVITE_ERROR_KEYS),
      inviteErrorKey(null),
      LICENSE_ALIAS_TOO_LONG_KEY,
      ...Object.values(ERROR_KEYS),
      'errors.tryAgain',
      ...Object.keys(ROLES).map((role) => `team.roles.${role}`),
      ...WEBHOOK_STATUSES.map((status) => `webhooks.status.${status}`),
      ...PRESETS.map((preset) => `timeRange.presets.${preset}`),
      ...Object.keys(PRESET_KEYS).map((preset) => `timeRange.presets.${preset}`),
      ...WEEKDAY_KEYS.map((day) => `datePicker.weekdays.${day}`),
      ...Object.keys(ENTITLEMENT_KINDS).map(
        (kind) => `templateEditor.entitlement.${kind}`,
      ),
      ...Object.keys(OWNER_ONLY).flatMap((feature) => [
        `ownerOnly.${feature}.title`,
        `ownerOnly.${feature}.body`,
      ]),
    ]),
  )('%s', (key) => {
    expect(has('common', key)).toBe(true);
  });

  it('words every transaction error', async () => {
    const t = await getTranslations('common');
    for (const error of [
      { code: 4001 },
      new UserOperationFailedError(),
      new Error('x'),
    ]) {
      expect(() => txErrorStatus(error, t)).not.toThrow();
    }
  });

  it('labels every named signal and known permission', async () => {
    const t = await getTranslations('common');
    for (const name of NAMED_SIGNALS) expect(() => humanizeSignal(name, t)).not.toThrow();
    const everyPermission = Object.keys(PERMISSION_NAMES)
      .map((id) => 3n << BigInt(Number(id) * 2))
      .reduce((all, bit) => all | bit, 0n);
    expect(permissionLabels(`0x${everyPermission.toString(16)}`, t)).toHaveLength(
      Object.keys(PERMISSION_NAMES).length,
    );
  });

  it('words every entitlement reason, with and without vehicles', async () => {
    const t = await getTranslations('common');
    const reasons: Record<EntitlementReason['key'], EntitlementReason> = {
      curator: { key: 'curator' },
      licenseUnavailable: { key: 'licenseUnavailable' },
      manufacturerUnavailable: { key: 'manufacturerUnavailable' },
      licenseRequired: { key: 'licenseRequired' },
      create: { key: 'create', via: 'owner', tokenId: 1, alias: 'A' },
      licensed: { key: 'licensed', via: 'signer', tokenId: 1, alias: null },
      manufacturer: { key: 'manufacturer', make: 'Toyota', tokenId: 1 },
    };
    for (const reason of Object.values(reasons)) {
      for (const minted of [null, 0, 1, 2]) {
        expect(() => entitlementReasonText(reason, minted, t)).not.toThrow();
      }
    }
  });
});

describe('vehicles keys from tables', () => {
  it('labels every subject kind and detail row', async () => {
    const t = await getTranslations('vehicles');
    const kinds: Record<SubjectKind, true> = {
      'vehicle': true,
      'aftermarket-device': true,
      'synthetic-device': true,
      'account': true,
    };
    for (const kind of Object.keys(kinds) as SubjectKind[]) {
      const subject = { kind } as Subject;
      expect(() => [subjectLabel(subject, t), subjectSublabel(subject, t)]).not.toThrow();
    }
    const details: Record<SubjectDetailKey, true> = {
      makeModelYear: true,
      definitionId: true,
      owner: true,
      minted: true,
      vehicleDid: true,
      manufacturer: true,
      serial: true,
      deviceAddress: true,
      paired: true,
      deviceDid: true,
      connection: true,
      connectionAddress: true,
      accountDid: true,
    };
    for (const key of Object.keys(details)) {
      expect(has('vehicles', `subjects.details.${key}`)).toBe(true);
    }
  });
});

describe('license keys from tables', () => {
  it.each(TEXT_KEYS.map((key) => [key]))('vehicle table %s', (key) => {
    expect(has('license', key)).toBe(true);
  });
});
