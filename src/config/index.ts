import _ from 'lodash';

import * as defaultConfig from './default';
import * as productionConfig from './production';
import * as previewConfig from './preview';

type Configuration = {
  REGIONS: string[];
  DEVELOPER_TYPES: string[];
  backendUrl: string;
  RAINBOW_PROJECT: Record<string, string>;
};

export const getConfig = () => {
  // Determine the current environment
  const env = process.env.VERCEL_ENV;

  // Select the appropriate configuration to merge with default based on the environment
  let environmentConfig = {};
  switch (env) {
    case 'production':
      environmentConfig = productionConfig;
      break;
    case 'preview':
      environmentConfig = previewConfig;
      break;
    // Assuming 'development' should fall back to default
    case 'development':
    default:
      environmentConfig = {};
      break;
  }

  // Use lodash to deeply merge the default configuration with the environment-specific configuration
  return _.merge({}, defaultConfig, environmentConfig) as Configuration;
};

export default getConfig();
