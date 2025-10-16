interface SharedProps {
  client_id: string;
  configuration_name: string;
  redirectUri: string;
  mode: 'popup' | 'redirect';
  utm: string | null;
  altTitle: boolean;
  authenticatedLabel: string;
  unAuthenticatedLabel: string;
  expirationDate: string;
}

interface LoginWithDimoProps extends SharedProps {
  vehicles?: string;
  vehicleMakes?: string;
  powerTrainTypes?: string;
}

interface ShareVehiclesWithDimoProps extends SharedProps {
  permissionsMode: 'template' | 'custom';
  permissionTemplateId: string | null;
  permissions: string[];
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
