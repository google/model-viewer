import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import mochaPlugin from 'eslint-plugin-mocha';
import wcPlugin from 'eslint-plugin-wc';

export default [
  // Unified ignore patterns (from .eslintignore and previous config)
  {
    ignores: [
      '**/node_modules',
      'scripts/**/*.js',
      'packages/*/dist',
      'packages/**/*.d.ts',
      'packages/*/src/*-css.ts'
    ],
  },
  // Base recommended configs
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2017,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        goog: false,
      },
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2017,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'mocha': mochaPlugin,
      'wc': wcPlugin,
    },
    settings: {
      wc: {
        elementBaseClasses: ['BaseElement', 'LitElement', 'FormElement'],
      },
    },
    rules: {
      // Rules temporarily disabled
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Rules disabled in favor of clang-format
      '@typescript-eslint/indent': 'off',
      'indent': 'off',
      'max-len': 'off',
      'block-spacing': 'off',
      'keyword-spacing': 'off',
      'space-before-function-paren': 'off',
      // clang-format wants async(foo) => {} without a space
      '@typescript-eslint/explicit-member-accessibility': ['error', { 'accessibility': 'no-public' }],
      'no-new': 'warn',
      'quotes': ['error', 'single', { 'avoidEscape': true }],
      'no-var': 'error',
      'curly': 'error',
      'no-floating-decimal': 'error',
      'no-unused-vars': 'error',
      '@typescript-eslint/no-unused-vars': 'off',
      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',
      'prefer-const': 'error',
      'comma-dangle': 'off',
      // Mocha rules
      'mocha/handle-done-callback': 'error',
      'mocha/no-exclusive-tests': 'error',
      'mocha/no-identical-title': 'error',
      'mocha/no-nested-tests': 'error',
      'mocha/no-pending-tests': 'error',
    },
  },
  // TypeScript-specific overrides
  {
    files: ['packages/**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      'no-invalid-this': 'off',
      'new-cap': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  // Test file overrides
  {
    files: [
      'packages/**/test/**/*.ts',
      'packages/**/test/**/*.js',
      'packages/**/*.spec.ts',
      'packages/**/*.spec.js',
      'packages/**/*.spec.mjs',
      'packages/**/*.spec.cjs',
      'packages/**/*.test.ts',
      'packages/**/*.test.js',
      'packages/**/*.test.mjs',
      'packages/**/*.test.cjs',
    ],
    languageOptions: {
      globals: {
        ...globals.mocha,
        ...globals.browser,
        goog: false,
      },
    },
  },
  // Node/script overrides
  {
    files: [
      'scripts/**/*.js',
      'packages/render-fidelity-tools/**/*.{js,ts}',
      'packages/model-viewer/scripts/**/*.js',
      'packages/model-viewer/tools/**/*.js',
      'packages/model-viewer/tools/**/*.ts',
      'packages/model-viewer-effects/scripts/**/*.js',
      'packages/model-viewer-effects/tools/**/*.js',
      'packages/model-viewer-effects/tools/**/*.ts',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
        goog: false,
      },
    },
  },
]; 