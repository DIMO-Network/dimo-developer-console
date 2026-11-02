import { CodegenConfig } from '@graphql-codegen/cli';
import appConfig from './config';

const config: CodegenConfig = {
  schema: appConfig.identityApiUrl,
  // this assumes that all your source files are in a top-level `src/` directory - you might need to adjust this to your file structure
  // Not tests: their own queries (withApollo's probe) aren't in Identity's schema,
  // and one invalid document stops codegen from generating anything.
  documents: ['src/**/*.{ts,tsx}', '!src/**/__tests__/**'],
  generates: {
    'src/gql/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
      },
      // client-preset 6 types custom scalars (Address, BigInt, Time…) as
      // unknown; keep them as before.
      config: {
        defaultScalarType: 'any',
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
