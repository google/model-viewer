/* @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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
 */

/**
 * Materials variants extension
 *
 * Specification:
 * https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_variants
 */

/**
 * The code in this file is based on
 * https://github.com/takahirox/three-gltf-extensions/tree/main/loaders/KHR_materials_variants
 */

import {Material as ThreeMaterial, Mesh} from 'three';
import {GLTFReference} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {GLTF, GLTFLoaderPlugin, GLTFParser} from 'three/examples/jsm/loaders/GLTFLoader.js';


export interface UserDataVariantMapping {
  material: ThreeMaterial|null;
  gltfMaterialIndex: number;
}

/**
 * KHR_materials_variants specification allows duplicated variant names
 * but it makes handling the extension complex.
 * We ensure tha names and make it easier.
 * If you want to export the extension with the original names
 * you are recommended to write GLTFExporter plugin to restore the names.
 *
 * @param variantNames {Array<string>}
 * @return {Array<string>}
 */
const ensureUniqueNames = (variantNames: string[]) => {
  const uniqueNames = [];
  const knownNames = new Set<string>();

  for (const name of variantNames) {
    let uniqueName = name;
    let suffix = 0;
    // @TODO: An easy solution.
    //        O(N^2) in the worst scenario where N is variantNames.length.
    //        Fix me if needed.
    while (knownNames.has(uniqueName)) {
      uniqueName = name + '.' + (++suffix);
    }
    knownNames.add(uniqueName);
    uniqueNames.push(uniqueName);
  }

  return uniqueNames;
};

/**
 * Convert mappings array to table object to make handling the extension easier.
 *
 * @param
 *     extensionDef {glTF.meshes[n].primitive.extensions.KHR_materials_variants}
 * @param variantNames {Array<string>} Required to be unique names
 * @return {Map}
 */
const mappingsArrayToTable = (extensionDef:
                                  any): Map<number, UserDataVariantMapping> => {
  const table = new Map<number, UserDataVariantMapping>();
  for (const mapping of extensionDef.mappings) {
    for (const variant of mapping.variants) {
      table.set(variant, {material: null, gltfMaterialIndex: mapping.material});
    }
  }
  return table;
};

export default class GLTFMaterialsVariantsExtension implements
    GLTFLoaderPlugin {
  parser: GLTFParser;
  name: string;

  constructor(parser: GLTFParser) {
    this.parser = parser;
    this.name = 'KHR_materials_variants';
  }

  // Note that the following properties will be overridden even if they are
  // pre-defined
  // - gltf.userData.variants
  // - mesh.userData.variantMaterials
  afterRoot(gltf: GLTF) {
    const parser = this.parser;
    const json = parser.json;

    if (json.extensions === undefined ||
        json.extensions[this.name] === undefined) {
      return null;
    }

    const extensionDef = json.extensions[this.name];
    const variantsDef = extensionDef.variants || [];
    const variants =
        ensureUniqueNames(variantsDef.map((v: {name: string}) => v.name));

    for (const scene of gltf.scenes) {
      // Save the variants data under associated mesh.userData
      scene.traverse(object => {
        const mesh = object as Mesh;

        if (!mesh.material) {
          return;
        }

        const association = parser.associations.get(mesh) as GLTFReference &
            {primitives: number};

        if (association == null || association.meshes == null ||
            association.primitives == null) {
          return;
        }

        const meshDef = json.meshes[association.meshes];
        const primitivesDef = meshDef.primitives;
        const primitiveDef = primitivesDef[association.primitives];
        const extensionsDef = primitiveDef.extensions;

        if (!extensionsDef || !extensionsDef[this.name]) {
          return;
        }

        mesh.userData.variantMaterials =
            mappingsArrayToTable(extensionsDef[this.name]);
      });
    }

    gltf.userData.variants = variants;

    return Promise.resolve();
  }
}
