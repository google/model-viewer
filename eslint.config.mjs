import js from '@eslint/js';
import globals from 'globals';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import mochaPlugin from 'eslint-plugin-mocha';
import wcPlugin from 'eslint-plugin-wc';

export default [
  // Ignore patterns for build outputs and generated files
  {
    ignores: [
      '**/node_modules',
      'scripts/**/*.js',
      'packages/*/dist',
      'packages/**/*.d.ts',
      'packages/*/src/*-css.ts',
    ],
  },
  
  // Base ESLint recommended rules
  js.configs.recommended,
  
  // Main configuration for TypeScript and JavaScript files
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
      mocha: mochaPlugin,
      wc: wcPlugin,
    },
    settings: {
      wc: {
        elementBaseClasses: ['BaseElement', 'LitElement', 'FormElement'],
      },
    },
    rules: {
      // TypeScript and formatting rules (disabled for flexibility)
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/indent': 'off',
      'indent': 'off',
      'max-len': 'off',
      'block-spacing': 'off',
      'keyword-spacing': 'off',
      'space-before-function-paren': 'off',
      '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],

      // Code style rules
      'no-new': 'warn',
      'quotes': ['error', 'single', { avoidEscape: true }],
      'no-var': 'error',
      'curly': ["warn", "multi-line"],
      'no-floating-decimal': 'error',
      'prefer-const': 'error',
      'comma-dangle': 'off',
      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',

      // Allow type/const name shadowing (common in TypeScript)
      'no-redeclare': 'off',
      'no-shadow': 'off',
      '@typescript-eslint/no-shadow': 'off',
      'no-undef': 'off',

      // Unused variables detection
      'no-unused-vars': 'error',
      '@typescript-eslint/no-unused-vars': 'off',

      // Mocha testing rules
      'mocha/handle-done-callback': 'error',
      'mocha/no-exclusive-tests': 'error',
      'mocha/no-identical-title': 'error',
      'mocha/no-nested-tests': 'error',
      'mocha/no-pending-tests': 'error',
    },
  },
  
  // Relaxed rules for package source files
  {
    files: ['packages/**/*.ts'],
    rules: {
      'no-unused-vars': 'off',
      'no-invalid-this': 'off',
      'new-cap': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-undef': 'off',
    },
  },
  
  // Test files configuration with Mocha globals
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
  
  // Node.js scripts configuration
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