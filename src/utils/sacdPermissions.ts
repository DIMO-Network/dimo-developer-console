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
