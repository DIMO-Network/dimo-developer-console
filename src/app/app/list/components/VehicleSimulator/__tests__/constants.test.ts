import { MAKES, YEARS, buildDeviceDefinitionId } from '../constants';

describe('VehicleSimulator constants', () => {
  it('has exactly 5 makes', () => {
    expect(MAKES).toHaveLength(5);
  });

  it('each make has exactly 2 models', () => {
    MAKES.forEach((make) => {
      expect(make.models).toHaveLength(2);
    });
  });

  it('years range from 2022 to 2026 inclusive', () => {
    expect(YEARS).toEqual([2022, 2023, 2024, 2025, 2026]);
  });

  it('buildDeviceDefinitionId produces correct slug', () => {
    expect(buildDeviceDefinitionId('toyota', 'camry', 2022)).toBe('toyota-camry-2022');
    expect(buildDeviceDefinitionId('mercedes-benz', 's-class', 2023)).toBe(
      'mercedes-benz-s-class-2023',
    );
  });
});
