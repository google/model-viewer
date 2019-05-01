/*
 * Copyright 2016 Google Inc. All Rights Reserved.
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

const path = require('path');
const resolve = require('rollup-plugin-node-resolve');
const cleanup = require('rollup-plugin-cleanup');

const {NODE_ENV} = process.env;
const addPath = files => files.map(f => path.join(__dirname, f));

// Tag well-known warnings so we can silence them.
const IGNORE_WARNINGS = {
  // Some third party code emits warnings from parsing their
  // UMD/commonjs exporting.
  THIS_IS_UNDEFINED: addPath(['node_modules/marked/lib/marked.js']),
  // Some third party libraries may have optional modules.
  MISSING_EXPORT: addPath(['lib/third_party/three/GLTFLoader.js']),
};

const onwarn = (warning, warn) => {
  const filesToIgnore = IGNORE_WARNINGS[warning.code];
  if (filesToIgnore && filesToIgnore.indexOf(warning.id) !== -1) {
    return;
  }

  warn(warning);
};

const plugins = [
  resolve(),
];

const outputOptions = [{
  input: './lib/model-viewer.js',
  output: {
    file: './dist/model-viewer.js',
    sourcemap: true,
    format: 'esm',
    name: 'ModelViewerElement'
  },
  watch: {
    include: 'lib/**',
  },
  plugins,
  onwarn,
}];

if (NODE_ENV !== 'development') {
  plugins.unshift(cleanup({
    // Ideally we'd also clean third_party/three, which saves
    // ~45kb in filesize alone... but takes 2 minutes to build
    include: ['lib/**'],
    comments: 'none',
  }));

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
          include: 'lib/**',
        },
        plugins,
        onwarn,
      },
      {
        input: './lib/test/index.js',
        output: {
          file: './dist/unit-tests.js',
          format: 'esm',
          name: 'ModelViewerElementUnitTests'
        },
        watch: {
          include: 'lib/**',
        },
        plugins,
        onwarn,
      },
      {
        input: './lib/test/index.js',
        output: {
          file: './dist/unit-tests-umd.js',
          format: 'umd',
          name: 'ModelViewerElementUnitTests'
        },
        watch: {
          include: 'lib/**',
        },
        plugins,
        onwarn,
      },
      {
        input: './lib/test/fidelity/components/image-comparison-app.js',
        output: {
          file: './dist/image-comparison-app.js',
          sourcemap: true,
          format: 'iife',
          name: 'ImageComparisonApp'
        },
        watch: {
          include: '{lib/test/fidelity/**,lib/third_party/**}',
        },
        plugins,
        onwarn,
      },
      {
        input: './lib/test/fidelity/image-comparison-worker.js',
        output: {
          file: './dist/image-comparison-worker.js',
          sourcemap: true,
          format: 'iife',
          name: 'ImageComparisonWorker'
        },
        watch: {
          include: '{lib/test/fidelity/**,lib/third_party/**}',
        },
        plugins,
        onwarn,
      },
      {
        input: './lib/documentation/components/example-snippet.js',
        output: {
          file: './examples/built/dependencies.js',
          format: 'esm',
          name: 'DocumentationDependencies'
        },
        plugins,
        onwarn,
      },
      {
        input: './lib/documentation/components/example-snippet.js',
        output: {
          file: './examples/built/dependencies-umd.js',
          format: 'umd',
          name: 'DocumentationDependencies'
        },
        plugins,
        onwarn,
      });
}

export default outputOptions;
