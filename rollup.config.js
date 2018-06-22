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
const commonjs = require('rollup-plugin-commonjs');
const resolve = require('rollup-plugin-node-resolve');
const glsl = require('rollup-plugin-glsl');
const json = require('rollup-plugin-json');
const string = require('rollup-plugin-string');
const alias = require('rollup-plugin-alias');
const cleanup = require('rollup-plugin-cleanup');
const banner = fs.readFileSync(path.join(__dirname, 'licenses.txt'));

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
  banner,
  plugins: [
    commonjs(),
    cleanup({
      // Ideally we'd also clean third_party/three, which saves
      // ~45kb in filesize alone... but takes 2 minutes to build
      include: ['src/**'],
      comments: 'none',
    }),
   json({
      include: ['src/**', 'third_party/**'],
      exclude: ['node_modules/**'],
    }),
    alias({
      'three': path.join(__dirname, 'third_party', 'three', 'three.module.js'),
      'orbit-controls': path.join(__dirname, 'third_party', 'three', 'OrbitControls.js'),
      'gltf-loader': path.join(__dirname, 'third_party', 'three', 'GLTFLoader.js'),
      'wagner': path.join(__dirname, 'third_party', 'wagner'),
    }),
    glsl({
      include: ['src/**/*.vert', 'src/**/*.frag', 'src/**/*.glsl',
                'third_party/wagner/**/*.vert',
                'third_party/wagner/**/*.frag',
                'third_party/wagner/**/*.glsl'],
      sourceMap: false,
    }),
    string({
      include: '**/*.svg',
    }),
    resolve(),
  ],
};
