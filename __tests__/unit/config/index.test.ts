import { getConfig } from '@/config';
import * as defaultConfig from '@/config/default';
import * as productionConfig from '@/config/production';
import * as previewConfig from '@/config/preview';

describe('Configuration Loader', () => {
  it('should load default configuration for development environment', () => {
    process.env.VERCEL_ENV = 'development';

    expect(getConfig()).toEqual(defaultConfig);
  });

  it('should merge production configuration with default for production environment', () => {
    process.env.VERCEL_ENV = 'production';

    const expectedConfig = {
      ...defaultConfig,
      ...productionConfig,
    };
    expect(getConfig()).toEqual(expectedConfig);
  });

  it('should merge preview configuration with default for preview environment', () => {
    process.env.VERCEL_ENV = 'preview';

    const expectedConfig = {
      ...defaultConfig,
      ...previewConfig,
    };
    expect(getConfig()).toEqual(expectedConfig);
  });

  it('should use default configuration if VERCEL_ENV is undefined', () => {
    delete process.env.VERCEL_ENV; // or set to undefined

    expect(getConfig()).toEqual(defaultConfig);
  });
});
