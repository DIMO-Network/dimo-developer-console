import { MAKES, buildDeviceDefinitionId } from '../constants';

describe('VehicleSimulator constants', () => {
  it('has exactly 5 makes', () => {
    expect(MAKES).toHaveLength(5);
  });

  it('each make has exactly 2 models', () => {
    MAKES.forEach((make) => {
      expect(make.models).toHaveLength(2);
    });
  });

  it('each model has at least one year available', () => {
    MAKES.forEach((make) => {
      make.models.forEach((model) => {
        expect(model.years.length).toBeGreaterThan(0);
      });
    });
  });

  it('buildDeviceDefinitionId produces correct slug', () => {
    expect(buildDeviceDefinitionId('toyota', '4runner', 2022)).toBe(
      'toyota_4runner_2022',
    );
    expect(buildDeviceDefinitionId('tesla', 'model-3', 2024)).toBe('tesla_model-3_2024');
  });
});
