/*
 * Copyright 2019 Google LLC. All Rights Reserved.
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

const {nodeResolve: resolve} = require('@rollup/plugin-node-resolve');
const replace = require('@rollup/plugin-replace');
const cleanup = require('rollup-plugin-cleanup');
const {terser} = require('rollup-plugin-terser');
const commonjs = require('@rollup/plugin-commonjs');
const polyfill = require('rollup-plugin-polyfill');

const {NODE_ENV} = process.env;

const onwarn = (warning, warn) => {
  // Suppress non-actionable warning caused by TypeScript boilerplate:
  if (warning.code !== 'THIS_IS_UNDEFINED') {
    warn(warning);
  }
};

let plugins =
    [resolve({dedupe: ['three']}), replace({'Reflect.decorate': 'undefined'})];

const watchFiles = ['lib/**'];

const outputOptions = [{
  input: './lib/model-viewer.js',
  output: {
    file: './dist/model-viewer.js',
    sourcemap: true,
    format: 'esm',
    name: 'ModelViewerElement'
  },
  watch: {
    include: watchFiles,
  },
  plugins,
  onwarn,
}];

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
    })
  ];

  // IE11 does not support modules, so they are removed here, as well as in a
  // dedicated unit test build which is needed for the same reason.
  outputOptions.push(
      {
        input: './lib/model-viewer.js',
        output: {
          file: './dist/model-viewer-umd.js',
          sourcemap: true,
          format: 'umd',
          name: 'ModelViewerElement'
        },
        watch: {
          include: watchFiles,
        },
        plugins: pluginsIE11,
        onwarn,
      },
  );

  plugins = [
    ...plugins,
    terser(),
  ];

  outputOptions.push(
      {
        input: './dist/model-viewer.js',
        output: {
          file: './dist/model-viewer.min.js',
          sourcemap: true,
          format: 'esm',
          name: 'ModelViewerElement'
        },
        watch: {
          include: watchFiles,
        },
        plugins,
        onwarn,
      },
  );

  outputOptions.push(
    {
      input: './dist/model-viewer-umd.js',
      output: {
        file: './dist/model-viewer-umd.min.js',
        sourcemap: true,
        format: 'umd',
        name: 'ModelViewerElement'
      },
      watch: {
        include: watchFiles,
      },
      plugins,
      onwarn,
    },
);
}

export default outputOptions;
