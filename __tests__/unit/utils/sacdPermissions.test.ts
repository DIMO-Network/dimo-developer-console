import {
  decodeSacdPermissions,
  permissionLabels,
  permissionNames,
} from '@/utils/sacdPermissions';

// pairs 1,3,4,7 granted
const HEX = '0x' + ((3n << 2n) | (3n << 6n) | (3n << 8n) | (3n << 14n)).toString(16);

describe('sacd permissions', () => {
  it('decodes 2-bit pairs into privilege ids', () => {
    expect(decodeSacdPermissions(HEX)).toEqual([1, 3, 4, 7]);
    expect(decodeSacdPermissions('0x0')).toEqual([]);
    expect(decodeSacdPermissions('zz')).toEqual([]);
  });
  it('labels them for people and names them for token exchange', () => {
    expect(permissionLabels(HEX)).toEqual([
      'Non-location data',
      'Current location',
      'All-time location',
      'Raw data',
    ]);
    expect(permissionNames(HEX)).toEqual([
      'privilege:GetNonLocationHistory',
      'privilege:GetCurrentLocation',
      'privilege:GetLocationHistory',
      'privilege:GetRawData',
    ]);
  });
  it('shows unknown ids as their number', () => {
    const odd = '0x' + (3n << 40n).toString(16);
    expect(permissionLabels(odd)).toEqual(['Privilege 20']);
  });
});
