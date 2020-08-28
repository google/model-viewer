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

import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import {terser} from 'rollup-plugin-terser';

const onwarn = (warning, warn) => {
  // Suppress non-actionable warning caused by TypeScript boilerplate:
  if (warning.code !== 'THIS_IS_UNDEFINED') {
    warn(warning);
  }
};

const plugins = [
  {
    load(id) {
      console.log('RESOLVED PATH:', id);
      return null
    }
  },
  resolve(),
  replace({
    'Reflect.decorate': 'undefined',
  }),
  terser()
];
const watchFiles = ['lib/**'];

export default {
  input: './lib/demo.js',
  output: {
    file: './demo/demo.js',
    sourcemap: true,
    format: 'esm',
    name: 'ModelViewerElement'
  },
  watch: {
    include: watchFiles,
  },
  plugins,
  onwarn,
};
