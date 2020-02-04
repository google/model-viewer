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

const resolve = require('rollup-plugin-node-resolve');
const replace = require('rollup-plugin-replace');

const onwarn = (warning, warn) => {
  // Suppress non-actionable warning caused by TypeScript boilerplate:
  if (warning.code !== 'THIS_IS_UNDEFINED') {
    warn(warning);
  }
};

const plugins = [resolve(), replace({'Reflect.decorate': 'undefined'})];

const outputOptions = [{
  input: './lib/3dom.js',
  output:
      {file: './dist/3dom.js', sourcemap: true, format: 'esm', name: '3DOM'},
  watch: {include: 'lib/**', exclude: 'lib/**/*-spec.js', clearScreen: false},
  plugins,
  onwarn
}];

export default outputOptions;