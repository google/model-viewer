/*
 * Copyright 2023 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { nodeResolve: resolve } = require('@rollup/plugin-node-resolve');
const replace = require('@rollup/plugin-replace');
const cleanup = require('rollup-plugin-cleanup');
const { terser } = require('rollup-plugin-terser');
const commonjs = require('@rollup/plugin-commonjs');
const polyfill = require('rollup-plugin-polyfill');
import dts from 'rollup-plugin-dts';

const { NODE_ENV } = process.env;

const onwarn = (warning, warn) => {
  // Suppress non-actionable warning caused by TypeScript boilerplate:
  if (warning.code !== 'THIS_IS_UNDEFINED') {
    warn(warning);
  }
};

let plugins = [resolve(), replace({ 'Reflect.decorate': 'undefined' })];

const watchFiles = ['lib/**'];

const outputOptions = [
  {
    input: './lib/model-viewer-effects.js',
    output: {
      file: './dist/model-viewer-effects.js',
      sourcemap: true,
      format: 'esm',
      name: 'ModelViewerEffects',
      globals: {
        three: 'three',
      },
    },
    watch: {
      include: watchFiles,
    },
    plugins,
    external: ['three'],
    onwarn,
  },
];

if (NODE_ENV !== 'development') {
  const pluginsIE11 = [
    ...plugins,
    commonjs(),
    polyfill(['object.values/auto']),
    cleanup({
      // Ideally we'd also clean third_party/three, which saves
      // ~45kb in filesize alone... but takes 2 minutes to build
      include: ['lib/**'],
      comments: 'none',
    }),
  ];

  // IE11 does not support modules, so they are removed here, as well as in a
  // dedicated unit test build which is needed for the same reason.
  outputOptions.push({
    input: './lib/model-viewer-effects.js',
    output: {
      file: './dist/model-viewer-effects-umd.js',
      sourcemap: true,
      format: 'umd',
      name: 'ModelViewerEffects',
      globals: {
        three: 'three',
      },
    },
    watch: {
      include: watchFiles,
    },
    external: ['three'],
    plugins: pluginsIE11,
    onwarn,
  });

  plugins = [...plugins, terser()];

  outputOptions.push({
    input: './dist/model-viewer-effects.js',
    output: {
      file: './dist/model-viewer-effects.min.js',
      sourcemap: true,
      format: 'esm',
      name: 'ModelViewerEffects',
      globals: {
        three: 'three',
      },
    },
    watch: {
      include: watchFiles,
    },
    external: ['three'],
    plugins,
    onwarn,
  });

  outputOptions.push({
    input: './dist/model-viewer-effects-umd.js',
    output: {
      file: './dist/model-viewer-effects-umd.min.js',
      sourcemap: true,
      format: 'umd',
      name: 'ModelViewerEffects',
      globals: {
        three: 'three',
      },
    },
    watch: {
      include: watchFiles,
    },
    external: ['three'],
    plugins,
    onwarn,
  });

  outputOptions.push({
    input: './lib/model-viewer-effects.d.ts',
    output: {
      file: './dist/model-viewer-effects.d.ts',
      format: 'esm',
      name: 'ModelViewerEffects',
    },
    plugins: [dts()],
  });
}

export default outputOptions;
