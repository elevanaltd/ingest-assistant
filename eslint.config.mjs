import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  // Ignore patterns (replaces ignorePatterns from .eslintrc.cjs)
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  // Base config for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    linterOptions: {
      reportUnusedDisableDirectives: false,
    },
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: typescriptParser,
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // ESLint recommended rules
      ...js.configs.recommended.rules,
      // TypeScript ESLint recommended rules
      ...typescript.configs.recommended.rules,
      // React Hooks recommended rules
      ...reactHooks.configs.recommended.rules,
      // Disable no-undef for TypeScript (TypeScript handles this)
      'no-undef': 'off',
      // Configure no-unused-vars to allow unused catch variables (replicate v6 behavior)
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_|^error$|^err$|^e$|^jsonError$',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      // Custom rules from .eslintrc.cjs
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
