import { CodegenConfig } from '@graphql-codegen/cli';

const URL =
  process.env.VERCEL_ENV === 'production'
    ? 'https://identity-api.dimo.zone/query'
    : 'https://identity-api.dev.dimo.zone/query';

const config: CodegenConfig = {
  schema: URL,
  // this assumes that all your source files are in a top-level `src/` directory - you might need to adjust this to your file structure
  documents: ['src/**/*.{ts,tsx}'],
  generates: {
    './src/gql/': {
      preset: 'client',
      plugins: [],
      presetConfig: {
        gqlTagName: 'gql',
      },
    },
  },
  ignoreNoDocuments: true,
};

export default config;
