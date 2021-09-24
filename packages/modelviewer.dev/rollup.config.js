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

const onwarn = (warning, warn) => {
  // Suppress non-actionable warning caused by TypeScript boilerplate:
  if (warning.code !== 'THIS_IS_UNDEFINED') {
    warn(warning);
  }
};

const plugins = [resolve(), replace({'Reflect.decorate': 'undefined'})];

const watchFiles = ['lib/**', '../model-viewer/lib/**'];

const outputOptions = [
  {
    input: './lib/components/example-snippet.js',
    output: {
      file: './examples/built/dependencies.js',
      format: 'esm',
      name: 'DocumentationDependencies'
    },
    plugins,
    onwarn,
  },
  {
    input: './lib/docs-and-examples/docs-and-examples.js',
    output: {
      file: './examples/built/docs-and-examples.js',
      sourcemap: true,
      format: 'esm',
      name: 'docs-and-examples'
    },
    watch: {
      include: watchFiles,
    },
    plugins,
    onwarn
  },
];

export default outputOptions;
