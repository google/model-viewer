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
const rollup = require('rollup');
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const glsl = require('rollup-plugin-glsl');
const json = require('rollup-plugin-json');
const string = require('rollup-plugin-string');

export default {
  input: './index.js',
  output: {
    file: './dist/xr-model-element.js',
    format: 'umd',
    name: 'XRModelElement',
  },
  watch: {
    include: 'src/**',
  },
  plugins: [
    commonjs(),
    glsl({
      include: ['src/**/*.vert', 'src/**/*.frag', 'src/**/*.glsl'],
      sourceMap: false,
    }),
    string({
      include: '**/*.svg',
    }),
    json({
      include: ['src/**'],
      exclude: ['node_modules/**'],
    }),
    resolve(),
  ],
};
