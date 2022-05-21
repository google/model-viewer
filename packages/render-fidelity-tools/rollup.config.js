/*
 * Copyright 2020 Google LLC. All Rights Reserved.
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
const externalGlobals = require('rollup-plugin-external-globals');
const {basename} = require('path');
const commonjs = require('@rollup/plugin-commonjs')

const onwarn = (warning, warn) => {
  // Suppress non-actionable warning caused by TypeScript boilerplate:
  if (warning.code !== 'THIS_IS_UNDEFINED') {
    warn(warning);
  }
};

const plugins = [
  commonjs(),
  resolve({preferBuiltins: true, browser: true}),
  replace({'Reflect.decorate': 'undefined'}),
  externalGlobals({filament: 'Filament'})
];

const buildTarget = (input, outputFormat) => ({
  input,
  output: {
    file: `./dist/${basename(input)}`,
    sourcemap: true,
    format: outputFormat,
    name: outputFormat === 'esm' ?
        undefined :
        basename(input)
            .split('-')
            .map(
                string =>
                    `${string.slice(0, 1).toUpperCase()}${string.slice(1)}`)
            .join('')
  },
  watch: {
    include: '{lib/**,lib/third_party/**}',
  },
  plugins,
  onwarn
});

const outputOptions = [
  buildTarget('./lib/components/image-comparison-app.js', 'esm'),
  buildTarget('./lib/components/renderer-harness.js', 'esm'),
  buildTarget('./lib/components/renderers/filament-viewer.js', 'esm'),
  buildTarget('./lib/components/renderers/dspbr-pt-viewer.js', 'esm'),
  buildTarget('./lib/components/renderers/babylon-viewer.js', 'esm'),
  buildTarget('./lib/components/renderers/rhodonite-viewer.js', 'esm'),
  buildTarget('./lib/components/renderers/gltf-sample-viewer.js', 'esm'),
  buildTarget('./lib/image-comparison-worker.js', 'iife')
];

export default outputOptions;
