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
 * https://github.com/takahirox/three-gltf-extensions/tree/main/loaders/KHR_materials_variants
 */

/**
 * The code in this file is based on
 * https://github.com/takahirox/three-gltf-extensions/tree/main/exporters/KHR_materials_variants
 */

import {Material, Mesh, Object3D} from 'three';

import {VariantData} from '../../features/scene-graph/model';

import {UserDataVariantMapping} from './VariantMaterialLoaderPlugin';



/**
 * @param object {THREE.Object3D}
 * @return {boolean}
 */
const compatibleObject = (object: Object3D) => {
  // @TODO: Need properer variantMaterials format validation?
  return (object as Mesh).material !==
      undefined &&        // easier than (!object.isMesh && !object.isLine &&
                          // !object.isPoints)
      object.userData &&  // just in case
      object.userData.variantMaterials &&
      // Is this line costly?
      !!Array
            .from((object.userData.variantMaterials as
                   Map<number, UserDataVariantMapping>)
                      .values())
            .filter(m => compatibleMaterial(m.material));
};

/**
 * @param material {THREE.Material}
 * @return {boolean}
 */
const compatibleMaterial = (material: Material|null) => {
  // @TODO: support multi materials?
  return material && material.isMaterial && !Array.isArray(material);
};

export default class GLTFExporterMaterialsVariantsExtension {
  writer: any;  // @TODO: Replace with GLTFWriter when GLTFExporter plugin TS
                // declaration is ready
  name: string;
  variantNames: string[];

  constructor(writer: any) {
    this.writer = writer;
    this.name = 'KHR_materials_variants';
    this.variantNames = [];
  }

  beforeParse(objects: Object3D[]) {
    // Find all variant names and store them to the table
    const variantNameSet = new Set<string>();
    for (const object of objects) {
      object.traverse(o => {
        if (!compatibleObject(o)) {
          return;
        }
        const variantMaterials =
            o.userData.variantMaterials as Map<number, UserDataVariantMapping>;
        const variantDataMap =
            o.userData.variantData as Map<string, VariantData>;
        for (const [variantName, variantData] of variantDataMap) {
          const variantMaterial = variantMaterials.get(variantData.index);
          // Ignore unloaded variant materials
          if (variantMaterial && compatibleMaterial(variantMaterial.material)) {
            variantNameSet.add(variantName);
          }
        }
      });
    }
    // We may want to sort?
    variantNameSet.forEach(name => this.variantNames.push(name));
  }

  writeMesh(mesh: Mesh, meshDef: any) {
    if (!compatibleObject(mesh)) {
      return;
    }

    const userData = mesh.userData;
    const variantMaterials =
        userData.variantMaterials as Map<number, UserDataVariantMapping>;
    const variantDataMap = userData.variantData as Map<string, VariantData>;
    const mappingTable　=
        new Map<number, {material: number, variants: number[]}>();

    // Removes gaps in the variant indices list (caused by deleting variants).
    const reIndexedVariants = new Map<number, number>();
    const variants = Array.from(variantDataMap.values()).sort((a, b) => {
      return a.index - b.index;
    });
    for (const [i, variantData] of variants.entries()) {
      reIndexedVariants.set(variantData.index, i);
    }

    for (const variantData of variantDataMap.values()) {
      const variantInstance = variantMaterials.get(variantData.index);
      if (!variantInstance || !compatibleMaterial(variantInstance.material)) {
        continue;
      }

      const materialIndex =
          this.writer.processMaterial(variantInstance.material);
      if (!mappingTable.has(materialIndex)) {
        mappingTable.set(
            materialIndex, {material: materialIndex, variants: []});
      }
      mappingTable.get(materialIndex)!.variants.push(
          reIndexedVariants.get(variantData.index)!);
    }

    const mappingsDef =
        Array.from(mappingTable.values())
            .map((m => {return m.variants.sort((a, b) => a - b) && m}))
            .sort((a, b) => a.material - b.material);

    if (mappingsDef.length === 0) {
      return;
    }

    const originalMaterialIndex =
        compatibleMaterial(userData.originalMaterial) ?
        this.writer.processMaterial(userData.originalMaterial) :
        -1;

    for (const primitiveDef of meshDef.primitives) {
      // Override primitiveDef.material with original material.
      if (originalMaterialIndex >= 0) {
        primitiveDef.material = originalMaterialIndex;
      }
      primitiveDef.extensions = primitiveDef.extensions || {};
      primitiveDef.extensions[this.name] = {mappings: mappingsDef};
    }
  }

  afterParse() {
    if (this.variantNames.length === 0) {
      return;
    }

    const root = this.writer.json;
    root.extensions = root.extensions || {};

    const variantsDef = this.variantNames.map(n => {
      return {name: n};
    });
    root.extensions[this.name] = {variants: variantsDef};
    this.writer.extensionsUsed[this.name] = true;
  }
}
