interface SharedProps {
  client_id: string;
  configuration_name: string;
  configuration_id: string;
  redirectUri: string;
  utm: string | null;
  expirationDate: string;
  privacyPolicyUrl?: string | null;
  tosUrl?: string | null;
  /** Login screens' language; empty lets the login follow the user's browser. */
  language?: LoginLanguage;
  /** Whether the login asks for the user's email; unset means optional. */
  emailRequest?: EmailRequest;
}

export const LOGIN_LANGUAGES = ['', 'en', 'ja', 'es', 'zh-Hans', 'zh-Hant'] as const;
export type LoginLanguage = (typeof LOGIN_LANGUAGES)[number];
export const EMAIL_REQUESTS = ['none', 'optional', 'required'] as const;
export type EmailRequest = (typeof EMAIL_REQUESTS)[number];

interface LoginWithDimoProps extends SharedProps {
  /** Brand name for the SDK's `brandOverride`. Empty = use workspace default. */
  brandName?: string;
}

interface ShareVehiclesWithDimoProps extends SharedProps {
  permissionsMode: 'template' | 'custom';
  permissionTemplateId: string | null;
  permissions: string[];
  /** Comma-separated in the form; saved as lists. */
  vehicles?: string;
  vehicleMakes?: string;
  powertrainTypes?: string;
  /** Document patterns (DOCUMENT_OPTIONS values) the app can read per vehicle. */
  documents?: DocumentPattern[];
  /** Brand name for the SDK's `brandOverride`. Empty = use workspace default. */
  brandName?: string;
}

interface ExecuteAdvanceTransactionWithDimoProps extends SharedProps {
  value: string;
  abi: Record<string, unknown> | string | null;
  functionName: string;
  args: string[] | string;
}

export type ComponentType =
  'LoginWithDimo' | 'ShareVehiclesWithDimo' | 'ExecuteAdvancedTransactionWithDimo';

export type DynamicFormProps =
  | ({ component: 'LoginWithDimo' } & LoginWithDimoProps)
  | ({ component: 'ShareVehiclesWithDimo' } & ShareVehiclesWithDimoProps)
  | ({
      component: 'ExecuteAdvancedTransactionWithDimo';
    } & ExecuteAdvanceTransactionWithDimoProps);

export const PERMISSIONS = [
  {
    key: 'NONLOCATION_TELEMETRY',
    enum: 'Permissions.GetNonLocationHistory',
  },
  {
    key: 'COMMANDS',
    enum: 'Permissions.ExecuteCommands',
  },
  {
    key: 'CURRENT_LOCATION',
    enum: 'Permissions.GetCurrentLocation',
  },
  {
    key: 'ALLTIME_LOCATION',
    enum: 'Permissions.GetLocationHistory',
  },
  {
    key: 'CREDENTIALS',
    enum: 'Permissions.GetVINCredential',
  },
  {
    key: 'STREAMS',
    enum: 'Permissions.GetLiveData',
  },
  {
    key: 'RAW_DATA',
    enum: 'Permissions.GetRawData',
  },
  {
    key: 'APPROXIMATE_LOCATION',
    enum: 'Permissions.GetApproximateLocation',
  },
];

/**
 * Documents a vehicle share can include, as the cloudevent patterns DIMO
 * login signs and names to the user (the SDK's DocumentAccess enum).
 * `messageKey` names the title and description in messages/en/configurator.json.
 */
export const DOCUMENT_OPTIONS = [
  {
    value: 'dimo.document.vehicle.*',
    messageKey: 'vehicle',
    enum: 'DocumentAccess.VehicleDocuments',
  },
  {
    value: 'dimo.document.driver.*',
    messageKey: 'driver',
    enum: 'DocumentAccess.DriverDocuments',
  },
  {
    value: 'dimo.raw.vehicle.*',
    messageKey: 'rawVehicle',
    enum: 'DocumentAccess.RawVehicleDocuments',
  },
  {
    value: 'dimo.raw.driver.*',
    messageKey: 'rawDriver',
    enum: 'DocumentAccess.RawDriverDocuments',
  },
] as const;

export type DocumentPattern = (typeof DOCUMENT_OPTIONS)[number]['value'];
