// ESLint 9 flat config. The rules are those of the former .eslintrc.js: Expo's
// `universe/native` preset (which includes Prettier) plus the project's own tweaks.
const { defineConfig } = require('eslint/config');
const universeNative = require('eslint-config-universe/flat/native');

module.exports = defineConfig([
  {
    ignores: ['node_modules/', '.expo/', 'dist/', 'web-build/', 'android/', 'ios/'],
  },
  universeNative,
  {
    rules: {
      'react/no-unescaped-entities': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'react/display-name': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // React Compiler rules, new in eslint-plugin-react-hooks 6+. They flag existing
      // code in a dozen screens; warnings until that code is reworked.
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/set-state-in-render': 'warn',
      'import/order': [
        'warn',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  {
    // Build-time config and Expo config plugins run in Node, not in the app.
    files: ['*.config.js', 'plugins/**/*.js'],
    languageOptions: {
      globals: { __dirname: 'readonly' },
    },
  },
]);
