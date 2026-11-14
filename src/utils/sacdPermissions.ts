// SACD permissions are a bitmap of 2-bit pairs; pair i === 0b11 grants privilege i.
// Privilege ids follow token-exchange-api/pkg/tokenclaims/permissions.go.
export const decodeSacdPermissions = (hex: string): number[] => {
  const clean = hex.toLowerCase().replace(/^0x/, '');
  if (!/^[0-9a-f]*$/.test(clean) || clean === '') return [];
  const bits = BigInt(`0x${clean}`);
  const granted: number[] = [];
  for (let i = 0; i < 128; i++) {
    if (((bits >> BigInt(i * 2)) & 3n) === 3n) granted.push(i);
  }
  return granted;
};

// Privileges 1 to 8, each as its 0b11 pair (pair i starts at bit 2i).
export const ALL_VEHICLE_PERMISSIONS = BigInt(262140);

export const PERMISSION_NAMES: Record<number, string> = {
  1: 'privilege:GetNonLocationHistory',
  2: 'privilege:ExecuteCommands',
  3: 'privilege:GetCurrentLocation',
  4: 'privilege:GetLocationHistory',
  5: 'privilege:GetVINCredential',
  6: 'privilege:GetLiveData',
  7: 'privilege:GetRawData',
  8: 'privilege:GetApproximateLocation',
};

// Pass the common-namespace `t`: a known privilege is labelled by
// `permissions.<id>`, any other by its number.
export const permissionLabels = (
  hex: string,
  t: (key: string, values?: Record<string, number>) => string,
): string[] =>
  decodeSacdPermissions(hex).map((id) =>
    PERMISSION_NAMES[id] ? t(`permissions.${id}`) : t('permissions.unknown', { id }),
  );

export const permissionNames = (hex: string): string[] =>
  decodeSacdPermissions(hex)
    .map((id) => PERMISSION_NAMES[id])
    .filter((n): n is string => !!n);
