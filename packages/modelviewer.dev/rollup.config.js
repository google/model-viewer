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

import { nodeResolve as resolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import terser from '@rollup/plugin-terser';
import swc from '@rollup/plugin-swc';

const onwarn = (warning, warn) => {
  // Suppress non-actionable warning caused by TypeScript boilerplate:
  if (warning.code !== 'THIS_IS_UNDEFINED') {
    warn(warning);
  }
};

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelViewerPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../model-viewer/package.json'), 'utf8'));
const effectsPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../model-viewer-effects/package.json'), 'utf8'));

const getVersion = (pkg, name) => (pkg.dependencies?.[name] || pkg.devDependencies?.[name] || '').replace(/^[^\d]*/, '');

const versions = {
  three: getVersion(modelViewerPkg, 'three'),
  modelViewer: modelViewerPkg.version || '',
  postprocessing: getVersion(effectsPkg, 'postprocessing'),
};

const plugins = [
  resolve(),
  replace({
    'Reflect.decorate': 'undefined',
    '__THREEJS_VERSION__': JSON.stringify(versions.three),
    '__MODELVIEWER_VERSION__': JSON.stringify(versions.modelViewer),
    '__POSTPROCESSING_VERSION__': JSON.stringify(versions.postprocessing),
    preventAssignment: true
  }),
  swc(),
  terser()
];

const watchFiles =
  ['lib/**', '../model-viewer/lib/**', '../model-viewer-effects/lib/**'];

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
