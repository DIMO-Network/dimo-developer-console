import {
  ComponentType,
  DOCUMENT_OPTIONS,
  DocumentPattern,
  DynamicFormProps,
  EmailRequest,
  LoginLanguage,
  PERMISSIONS,
} from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';

/*
 * How a configurator form is saved, loaded back for editing and shown as code.
 * DIMO login reads a saved configuration (`?configurationId=`) through the same
 * setters as the SDK's params, so the saved keys and shapes follow the SDK:
 * lists are arrays, the end date is ISO and documents are cloudEvent
 * agreements. Configurations saved before this keep loading: see toFormValues.
 */

export type SavedConfiguration = Record<string, unknown>;

const ENTRY_STATES: Record<ComponentType, string> = {
  LoginWithDimo: 'EMAIL_INPUT',
  ShareVehiclesWithDimo: 'VEHICLE_MANAGER',
  ExecuteAdvancedTransactionWithDimo: 'ADVANCED_TRANSACTION',
};

export const formatComponent = (component: ComponentType) => ENTRY_STATES[component];

export const inverseFormatComponent = (entryState: unknown) =>
  (Object.keys(ENTRY_STATES) as ComponentType[]).find(
    (component) => ENTRY_STATES[component] === entryState,
  );

/** Permissions as the login reads them: one digit per PERMISSIONS entry. */
export const formatPermissions = (permissions?: string[]) =>
  PERMISSIONS.map((p) => (permissions?.includes(p.key) ? '1' : '0')).join('');

export const inverseFormatPermissions = (bits: string) =>
  PERMISSIONS.filter((_, i) => bits[i] === '1').map((p) => p.key);

/** "a, b,,c" → ['a', 'b', 'c'] */
export const parseList = (value?: string | null) =>
  (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const tryParseJSON = (value?: unknown) => {
  if (typeof value !== 'string') return value ?? {};
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

/**
 * The end date as saved and as passed to the SDK. It is a calendar day (the
 * date picker gives local midnight of it) and the login shows it in the
 * user's time zone; noon UTC is that same day from UTC−11 to UTC+11.
 */
export const toEndDate = (value?: string | Date | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12),
  ).toISOString();
};

/** Documents as the agreements DIMO login signs, built as the SDK's `documents` prop does. */
export const toCloudEvent = (documents: readonly DocumentPattern[] = []) =>
  documents.map((eventType) => ({ eventType, ids: [], tags: ['documents'] }));

export const buildConfiguration = (values: DynamicFormProps): SavedConfiguration => {
  const saved: SavedConfiguration = {};
  const add = (key: string, value: unknown) => {
    if (value === undefined || value === null || value === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    saved[key] = value;
  };

  add('redirectUri', values.redirectUri);
  add('entryState', formatComponent(values.component));
  add('utm', values.utm);
  add('privacyPolicyUrl', values.privacyPolicyUrl);
  add('tosUrl', values.tosUrl);
  add('expirationDate', toEndDate(values.expirationDate));
  add('language', values.language);
  // Optional is the login's default.
  if (values.emailRequest && values.emailRequest !== 'optional') {
    add('emailRequest', values.emailRequest);
    // For logins that only know the older flag.
    if (values.emailRequest === 'required') add('forceEmail', true);
  }

  if (values.component === 'LoginWithDimo') {
    add('brandName', values.brandName);
  }

  if (values.component === 'ShareVehiclesWithDimo') {
    add('brandName', values.brandName);
    const permissionsMode = values.permissionsMode ?? 'template';
    add('permissionsMode', permissionsMode);
    if (permissionsMode === 'template') {
      add('permissionTemplateId', values.permissionTemplateId);
    } else {
      add('permissions', formatPermissions(values.permissions));
    }
    add('vehicles', parseList(values.vehicles));
    add('vehicleMakes', parseList(values.vehicleMakes));
    add('powertrainTypes', parseList(values.powertrainTypes));
    add('cloudEvent', toCloudEvent(values.documents));
  }

  if (values.component === 'ExecuteAdvancedTransactionWithDimo') {
    add('value', values.value);
    add('abi', tryParseJSON(values.abi));
    add('functionName', values.functionName);
    add('args', Array.isArray(values.args) ? values.args : parseList(values.args));
  }

  return saved;
};

// Saved for the edit page only.
const CONSOLE_ONLY_KEYS = ['permissionsMode'];

/** The same values as a login link's query string; lists repeat their key. */
export const toLoginQuery = (values: DynamicFormProps, clientId: string) => {
  const params = new URLSearchParams();
  if (clientId) params.set('clientId', clientId);
  Object.entries(buildConfiguration(values)).forEach(([key, value]) => {
    if (CONSOLE_ONLY_KEYS.includes(key)) return;
    if (Array.isArray(value) && value.every((v) => typeof v === 'string')) {
      value.forEach((v) => params.append(key, v));
    } else if (typeof value === 'object') {
      params.set(key, JSON.stringify(value));
    } else {
      params.set(key, String(value));
    }
  });
  return params.toString();
};

const text = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

// Lists: arrays now, comma-separated strings before.
const savedList = (value: unknown) =>
  (Array.isArray(value) ? value.map(text).filter(Boolean) : parseList(text(value))).join(
    ', ',
  );

// The end date as the date picker's local midnight. ISO now, MM-DD-YYYY before.
const savedEndDate = (value: unknown) => {
  const saved = text(value);
  if (!saved) return '';
  const legacy = saved.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (legacy) {
    return new Date(
      Number(legacy[3]),
      Number(legacy[1]) - 1,
      Number(legacy[2]),
    ).toISOString();
  }
  const date = new Date(saved);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ).toISOString();
};

const LANGUAGES: readonly LoginLanguage[] = ['en', 'ja'];
const EMAIL_REQUESTS: readonly EmailRequest[] = ['none', 'optional', 'required'];

const savedEmailRequest = (saved: SavedConfiguration): EmailRequest => {
  if (EMAIL_REQUESTS.includes(saved.emailRequest as EmailRequest)) {
    return saved.emailRequest as EmailRequest;
  }
  return saved.forceEmail === true || saved.forceEmail === 'true'
    ? 'required'
    : 'optional';
};

const DOCUMENT_PATTERNS: readonly string[] = DOCUMENT_OPTIONS.map((d) => d.value);

// What the old Attestations setting's tags are now part of.
const ATTESTATION_TAG_DOCUMENTS: Record<string, DocumentPattern> = {
  DriversLicense: 'dimo.document.driver.*',
  Insurance: 'dimo.document.vehicle.*',
  ServiceRecords: 'dimo.document.vehicle.*',
};

const savedDocuments = (cloudEvent: unknown): DocumentPattern[] => {
  const parsed = typeof cloudEvent === 'string' ? tryParseJSON(cloudEvent) : cloudEvent;
  if (!parsed || typeof parsed !== 'object') return [];
  const agreements = (Array.isArray(parsed) ? parsed : [parsed]) as {
    eventType?: unknown;
    tags?: unknown;
  }[];
  const requested = agreements.flatMap((agreement): string[] => {
    if (!agreement || typeof agreement !== 'object') return [];
    const { eventType, tags } = agreement;
    if (typeof eventType === 'string' && DOCUMENT_PATTERNS.includes(eventType)) {
      return [eventType];
    }
    if (eventType === 'dimo.attestation' && Array.isArray(tags)) {
      return tags.flatMap((tag) => ATTESTATION_TAG_DOCUMENTS[tag] ?? []);
    }
    return [];
  });
  return DOCUMENT_OPTIONS.map((d) => d.value).filter((value) =>
    requested.includes(value),
  );
};

/** A saved configuration as form values, repairing what older versions saved. */
export const toFormValues = (
  saved: SavedConfiguration,
  { id, configuration_name }: { id: string; configuration_name: string },
): DynamicFormProps => {
  const permissionTemplateId = text(saved.permissionTemplateId) || null;
  const permissionsMode =
    saved.permissionsMode === 'template' || saved.permissionsMode === 'custom'
      ? saved.permissionsMode
      : permissionTemplateId
        ? 'template'
        : 'custom';

  return {
    component: inverseFormatComponent(saved.entryState) ?? 'LoginWithDimo',
    configuration_id: id,
    configuration_name,
    redirectUri: text(saved.redirectUri),
    utm: text(saved.utm) || null,
    privacyPolicyUrl: text(saved.privacyPolicyUrl) || null,
    tosUrl: text(saved.tosUrl) || null,
    expirationDate: savedEndDate(saved.expirationDate),
    language: LANGUAGES.includes(saved.language as LoginLanguage)
      ? (saved.language as LoginLanguage)
      : '',
    emailRequest: savedEmailRequest(saved),
    brandName: text(saved.brandName),
    permissionsMode,
    permissionTemplateId,
    permissions:
      permissionsMode === 'custom'
        ? inverseFormatPermissions(text(saved.permissions))
        : [],
    vehicles: savedList(saved.vehicles),
    vehicleMakes: savedList(saved.vehicleMakes),
    powertrainTypes: savedList(saved.powertrainTypes ?? saved.powerTrainTypes),
    documents: savedDocuments(saved.cloudEvent),
  } as DynamicFormProps;
};

type RawCode = { __raw: string };

const raw = (code: string): RawCode => ({ __raw: code });

const isRaw = (value: unknown): value is RawCode =>
  typeof value === 'object' && value !== null && '__raw' in value;

const formatProps = (props: Record<string, unknown>): string =>
  Object.entries(props)
    .filter(([, v]) => {
      if (v === undefined || v === null || v === '') return false;
      if (Array.isArray(v) && v.length === 0) return false;
      return true;
    })
    .map(([k, v]) => {
      if (isRaw(v)) return `  ${k}={${v.__raw}}`;
      if (typeof v === 'string') return `  ${k}="${v}"`;
      if (Array.isArray(v)) {
        // Enum members one per line; plain values fit on one.
        const items = v.map((x) => (isRaw(x) ? x.__raw : JSON.stringify(x)));
        if (!v.some(isRaw)) return `  ${k}={[${items.join(', ')}]}`;
        return `  ${k}={[${items.join(`,\n${''.padEnd(k.length + 5, ' ')}`)}]}`;
      }
      if (typeof v === 'object') {
        return `  ${k}={${JSON.stringify(v, null, 2)
          .split('\n')
          .map((line, i) => (i === 0 ? line : '  ' + line))
          .join('\n')}}`;
      }
      return `  ${k}={${v}}`;
    })
    .join('\n');

// initializeDimoSDK's argument, without the keys that aren't set.
const formatObject = (
  entries: Record<string, string | undefined | null>,
  indent: string,
) =>
  Object.entries(entries)
    .filter(([, v]) => v)
    .map(([k, v]) => `${indent}${k}: '${v}',`)
    .join('\n');

/** The SDK code for these values: initializeDimoSDK plus the button. */
export const buildSnippet = (values: DynamicFormProps, clientId: string) => {
  const imports = new Set(['initializeDimoSDK', 'DimoSDKModes']);
  const baseProps: Record<string, unknown> = {
    mode: raw(
      values.mode === 'redirect' ? 'DimoSDKModes.REDIRECT' : 'DimoSDKModes.POPUP',
    ),
    utm: values.utm,
    altTitle: values.altTitle || undefined,
    authenticatedLabel: values.authenticatedLabel,
    unAuthenticatedLabel: values.unAuthenticatedLabel,
    expirationDate: toEndDate(values.expirationDate),
    onSuccess: raw('(authData) => console.log("Success:", authData)'),
    onError: raw('(error) => console.error("Error:", error)'),
  };
  const brandOverride =
    'brandName' in values && values.brandName
      ? raw(`{ name: ${JSON.stringify(values.brandName)} }`)
      : undefined;

  let button = '';

  if (values.component === 'LoginWithDimo') {
    imports.add('LoginWithDimo');
    button = `<LoginWithDimo\n${formatProps({ ...baseProps, brandOverride })}\n/>`;
  }

  if (values.component === 'ShareVehiclesWithDimo') {
    imports.add('ShareVehiclesWithDimo');
    const custom = values.permissionsMode === 'custom';
    if (custom) imports.add('Permissions');
    if (values.documents?.length) imports.add('DocumentAccess');
    const props: Record<string, unknown> = {
      ...baseProps,
      permissionTemplateId: custom ? undefined : values.permissionTemplateId,
      permissions: custom
        ? values.permissions?.map((k) =>
            raw(PERMISSIONS.find((p) => p.key === k)?.enum ?? 'none'),
          )
        : undefined,
      documents: values.documents?.map((d) =>
        raw(DOCUMENT_OPTIONS.find((o) => o.value === d)?.enum ?? `'${d}'`),
      ),
      vehicles: parseList(values.vehicles),
      vehicleMakes: parseList(values.vehicleMakes),
      powertrainTypes: parseList(values.powertrainTypes),
      brandOverride,
    };
    button = `<ShareVehiclesWithDimo\n${formatProps(props)}\n/>`;
  }

  if (values.component === 'ExecuteAdvancedTransactionWithDimo') {
    imports.add('ExecuteAdvancedTransactionWithDimo');
    const props: Record<string, unknown> = {
      ...baseProps,
      value: values.value,
      abi: tryParseJSON(values.abi),
      functionName: values.functionName,
      args: Array.isArray(values.args) ? values.args : parseList(values.args),
    };
    button = `<ExecuteAdvancedTransactionWithDimo\n${formatProps(props)}\n/>`;
  }

  const options = formatObject(
    {
      emailRequest:
        values.emailRequest && values.emailRequest !== 'optional'
          ? values.emailRequest
          : undefined,
      language: values.language,
      tosUrl: values.tosUrl,
      privacyPolicyUrl: values.privacyPolicyUrl,
    },
    '    ',
  );
  const init = [
    `  clientId: '${clientId}',`,
    `  redirectUri: '${values.redirectUri ?? ''}',`,
    ...(options ? [`  options: {\n${options}\n  },`] : []),
  ].join('\n');

  return [
    `import {\n${[...imports].map((name) => `  ${name},`).join('\n')}\n} from '@dimo-network/login-with-dimo';`,
    `initializeDimoSDK({\n${init}\n});`,
    button,
  ].join('\n\n');
};
