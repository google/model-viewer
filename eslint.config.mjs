/* @license
 * Copyright 2026 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Formatting is owned by clang-format (see .clang-format), so this config
// only enables correctness rules. The recommended presets below contain no
// stylistic rules.

import {includeIgnoreFile} from '@eslint/compat';
import js from '@eslint/js';
import {defineConfig} from 'eslint/config';
import mocha from 'eslint-plugin-mocha';
import wc from 'eslint-plugin-wc';
import globals from 'globals';
import {fileURLToPath} from 'node:url';
import tseslint from 'typescript-eslint';

const gitignore = fileURLToPath(new URL('.gitignore', import.meta.url));

const testFiles = ['packages/*/src/test/**/*.ts', '**/*-spec.ts'];

export default defineConfig(
    includeIgnoreFile(gitignore),
    {
      ignores: [
        '**/*.d.ts',
        '**/shared-assets/**',
        '**/third_party/**',
        'packages/modelviewer.dev/examples/built/**',
        'packages/render-fidelity-tools/test/results/**',
      ],
    },

    js.configs.recommended,
    tseslint.configs.recommended,
    wc.configs['flat/best-practice'],

    {
      languageOptions: {
        globals: globals.browser,
      },
      rules: {
        curly: 'error',
        eqeqeq: ['error', 'smart'],
        'no-var': 'error',
        'prefer-const': 'error',
        // clang-format puts call arguments and template literals on the line
        // after the callee/tag (e.g. `Mixin\n(Base)`, `html\n`...``), which
        // this rule flags.
        'no-unexpected-multiline': 'off',

        '@typescript-eslint/explicit-member-accessibility':
            ['error', {accessibility: 'no-public'}],
        // Tighten to 'error' once existing usages are typed. Rest args are
        // allowed because TypeScript mixins require `...args: any[]`.
        '@typescript-eslint/no-explicit-any': ['warn', {ignoreRestArgs: true}],
        // Mirror tsc's noUnusedLocals/noUnusedParameters, which allow a
        // leading underscore.
        '@typescript-eslint/no-unused-vars': [
          'error',
          {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^_',
          },
        ],
      },
    },

    // Build configs and scripts run in Node.
    {
      files: [
        '**/rollup.config.js',
        '**/*.config.mjs',
        'scripts/**/*.js',
        'packages/*/scripts/**/*.js',
        'packages/modelviewer.dev/examples/lut-writer.mjs',
      ],
      languageOptions: {
        globals: globals.node,
      },
    },

    {
      files: testFiles,
      extends: [mocha.configs.recommended],
      rules: {
        // The test suites consistently use arrow functions.
        'mocha/no-mocha-arrows': 'off',
        // chai assertions such as `expect(x).to.be.true` are expressions.
        '@typescript-eslint/no-unused-expressions': 'off',
      },
    },
);
