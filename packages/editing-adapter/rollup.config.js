/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

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

const watchFiles = ['lib/**', '../3dom/lib/**', '../model-viewer/lib/**'];
const plugins = [resolve()];

export default [
  {
    input: './lib/gltf/gltf_model.js',
    output: {
      file: './dist/editing-adapter.js',
      format: 'esm',
      name: 'Editing Adapter'
    },
    plugins,
    watch: {
      include: watchFiles,
    },
  },
  {
    input: './lib/gltf/scene_graph_worklet.js',
    output: {
      file: './dist/scene_graph_worklet.js',
      format: 'esm',
      name: 'Editing Adapter Worklet'
    },
    plugins,
    watch: {
      include: watchFiles,
    },
  }
];
