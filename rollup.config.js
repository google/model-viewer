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

const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const resolve = require('rollup-plugin-node-resolve');
const cleanup = require('rollup-plugin-cleanup');
const banner = fs.readFileSync(path.join(__dirname, 'licenses.txt'));

const plugins = [
  cleanup({
    // Ideally we'd also clean third_party/three, which saves
    // ~45kb in filesize alone... but takes 2 minutes to build
    include: ['lib/**'],
    comments: 'none',
  }),
  resolve(),
];

export default [
  {
    input: './lib/model-viewer-element.js',
    output: {
      file: './dist/model-viewer-element.js',
      format: 'umd',
      name: 'ModelViewerElement',
      banner
    },
    watch: {
      include: 'lib/**',
    },
    plugins
  },
  {
    input: './lib/test/index.js',
    output: {
      file: './dist/unit-tests.js',
      format: 'umd',
      name: 'ModelViewerElementUnitTests',
      banner
    },
    watch: {
      include: 'lib/**',
    },
    plugins
  }
];
