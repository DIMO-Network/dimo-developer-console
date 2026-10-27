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

export const LOGIN_LANGUAGES = ['', 'en', 'ja'] as const;
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
  | 'LoginWithDimo'
  | 'ShareVehiclesWithDimo'
  | 'ExecuteAdvancedTransactionWithDimo';

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
    title: 'Non Location Telemetry',
    description: 'Access to non-location vehicle telemetry',
  },
  {
    key: 'COMMANDS',
    enum: 'Permissions.ExecuteCommands',
    title: 'Commands',
    description: 'Execute vehicle commands',
  },
  {
    key: 'CURRENT_LOCATION',
    enum: 'Permissions.GetCurrentLocation',
    title: 'Current Location',
    description: 'Access to current vehicle location',
  },
  {
    key: 'ALLTIME_LOCATION',
    enum: 'Permissions.GetLocationHistory',
    title: 'All Time Location',
    description: 'Access to historical location data',
  },
  {
    key: 'CREDENTIALS',
    enum: 'Permissions.GetVINCredential',
    title: 'Credentials',
    description: 'Access to VIN credentials',
  },
  {
    key: 'STREAMS',
    enum: 'Permissions.GetLiveData',
    title: 'Streams',
    description: 'Access to live data streams',
  },
  {
    key: 'RAW_DATA',
    enum: 'Permissions.GetRawData',
    title: 'Raw Data',
    description: 'Access to raw vehicle data',
  },
  {
    key: 'APPROXIMATE_LOCATION',
    enum: 'Permissions.GetApproximateLocation',
    title: 'Approximate Location',
    description: 'Access to approximate location data',
  },
];

/**
 * Documents a vehicle share can include, as the cloudevent patterns DIMO
 * login signs and names to the user (the SDK's DocumentAccess enum).
 */
export const DOCUMENT_OPTIONS = [
  {
    value: 'dimo.document.vehicle.*',
    enum: 'DocumentAccess.VehicleDocuments',
    title: 'Vehicle documents',
    description: 'Registration, insurance, service records and other vehicle documents.',
  },
  {
    value: 'dimo.document.driver.*',
    enum: 'DocumentAccess.DriverDocuments',
    title: 'Driver documents',
    description: "The owner's driver's license and other driver documents.",
  },
  {
    value: 'dimo.raw.vehicle.*',
    enum: 'DocumentAccess.RawVehicleDocuments',
    title: 'Original vehicle files',
    description: 'The photos and PDFs behind the vehicle documents.',
  },
  {
    value: 'dimo.raw.driver.*',
    enum: 'DocumentAccess.RawDriverDocuments',
    title: 'Original driver files',
    description: 'The photos and PDFs behind the driver documents.',
  },
] as const;

export type DocumentPattern = (typeof DOCUMENT_OPTIONS)[number]['value'];
