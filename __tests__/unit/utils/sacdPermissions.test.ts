import { getTranslations } from 'next-intl/server';
import {
  decodeSacdPermissions,
  permissionLabels,
  permissionNames,
  ALL_VEHICLE_PERMISSIONS,
} from '@/utils/sacdPermissions';

// pairs 1,3,4,7 granted
const HEX = '0x' + ((3n << 2n) | (3n << 6n) | (3n << 8n) | (3n << 14n)).toString(16);

describe('sacd permissions', () => {
  it('decodes 2-bit pairs into privilege ids', () => {
    expect(decodeSacdPermissions(HEX)).toEqual([1, 3, 4, 7]);
    expect(decodeSacdPermissions('0x0')).toEqual([]);
    expect(decodeSacdPermissions('zz')).toEqual([]);
  });
  it('labels them for people and names them for token exchange', async () => {
    expect(permissionLabels(HEX, await getTranslations('common'))).toEqual([
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
  it('shows unknown ids as their number', async () => {
    const odd = '0x' + (3n << 40n).toString(16);
    expect(permissionLabels(odd, await getTranslations('common'))).toEqual([
      'Privilege 20',
    ]);
  });
});

describe('ALL_VEHICLE_PERMISSIONS', () => {
  it('grants every permission a signed vehicle SACD lists', () => {
    expect(decodeSacdPermissions(ALL_VEHICLE_PERMISSIONS.toString(16))).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
  });
});
