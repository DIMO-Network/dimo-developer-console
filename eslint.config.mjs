// @ts-check
import nextVitals from 'eslint-config-next/core-web-vitals';
import ts from 'typescript-eslint';
import prettierConfigRecommended from 'eslint-plugin-prettier/recommended';
import pluginQuery from '@tanstack/eslint-plugin-query';

const config = [
  ...nextVitals,
  {
    // eslint-config-next 16 brings react-hooks 7, whose React Compiler rules
    // flag code written before them. The console doesn't use the compiler;
    // these stay off until that code is reworked on purpose.
    rules: {
      'react-hooks/globals': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  ...ts.configs.recommended,
  ...pluginQuery.configs['flat/recommended'],
  prettierConfigRecommended,
  { ignores: ['.next/*', './next-env.d.ts', '.remember/**'] },
];

export default config;
