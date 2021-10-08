/* @license
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
 */
import {Material as ThreeMaterial, Mesh} from 'three';

import {CorrelatedSceneGraph} from '../../../three-components/gltf-instance/correlated-scene-graph.js';
import {KHRMaterialsVariants, Primitive} from '../../../three-components/gltf-instance/gltf-2.0.js';
import {$getLoadedMaterial, Material} from '../material.js';



export const $materials = Symbol('materials');
const $variantInfo = Symbol('variantInfo');
const $mesh = Symbol('mesh');
export const $primitives = Symbol('primitives');
export const $loadVariant = Symbol('loadVariant');
export const $correlatedSceneGraph = Symbol('correlatedSceneGraph');
export const $prepareVariantsForExport = Symbol('prepareVariantsForExport');
export const $switchVariant = Symbol('switchVariant');
export const $children = Symbol('children');
export const $initialMaterialIdx = Symbol('initialMaterialIdx');
export const $activeMaterialIdx = Symbol('activeMaterialIdx');

// Defines the base level node methods and data.
export class Node {
  name: string = '';
  [$children] = new Array<Node>();
  constructor(name: string) {
    this.name = name;
  }
}

// Represents a primitive in a glTF mesh.
export class PrimitiveNode extends Node {
  private[$mesh]: Mesh;
  // Maps glTF material index number to a material that this primitive supports.
  private[$materials] = new Map<number, Material>();
  // Maps variant name to material index.
  private[$variantInfo]: Map<string, {material: Material, index: number}>;
  private[$initialMaterialIdx]: number;
  private[$activeMaterialIdx]: number;

  constructor(
      mesh: Mesh, mvMaterials: Material[],
      correlatedSceneGraph: CorrelatedSceneGraph) {
    super(mesh.name);
    this[$mesh] = mesh;
    const {gltf, threeGLTF, threeObjectMap} = correlatedSceneGraph;

    // Captures the primitive's initial material.
    const materialMappings =
        threeObjectMap.get(mesh.material as ThreeMaterial)!;
    if (materialMappings.materials != null) {
      this[$initialMaterialIdx] = this[$activeMaterialIdx] =
          materialMappings.materials;
    } else {
      console.error(
          `Primitive (${mesh.name}) missing initial material reference.`);
    }

    // Gets the mesh index from the node.
    const meshMappings = threeObjectMap.get(mesh)!;
    const meshIndex = meshMappings.meshes!;

    // The gltf mesh array to sample from.
    const meshElementArray = gltf['meshes'] || [];
    // List of primitives under the mesh.
    const gltfPrimitives =
        (meshElementArray[meshIndex].primitives || []) as Primitive[];

    for (const primitive of gltfPrimitives) {
      // Maps the primitive default to a material.
      if (primitive.material != null) {
        this[$materials].set(
            primitive.material, mvMaterials[primitive.material]);
      } else {
        const defaultIdx = mvMaterials.findIndex((mat: Material) => {
          return mat.name === 'Default';
        });
        if (defaultIdx >= 0) {
          this[$materials].set(defaultIdx, mvMaterials[defaultIdx]);
        } else {
          console.warn('Primitive has no material!');
        }
      }

      if (primitive.extensions &&
          primitive.extensions['KHR_materials_variants']) {
        const variantsExtension =
            primitive.extensions['KHR_materials_variants'] as
            KHRMaterialsVariants;
        const extensions = threeGLTF.parser.json.extensions;
        const variantNames = extensions['KHR_materials_variants'].variants;
        // Provides definition now that we know there are variants to
        // support.
        this[$variantInfo] =
            new Map<string, {material: Material, index: number}>();
        for (const mapping of variantsExtension.mappings) {
          // Maps variant indices to Materials.
          this[$materials].set(mapping.material, mvMaterials[mapping.material]);
          for (const variant of mapping.variants) {
            const {name} = variantNames[variant];
            this[$variantInfo].set(name, {
              material: mvMaterials[mapping.material],
              index: mapping.material
            });
          }
        }
      }
    }
  }

  get mesh() {
    return this[$mesh];
  }

  async setActiveMaterial(material: number):
      Promise<ThreeMaterial|ThreeMaterial[]|null> {
    const mvMaterial = this[$materials].get(material);
    if (mvMaterial != null) {
      this.mesh.material = await mvMaterial[$getLoadedMaterial]();
      this[$activeMaterialIdx] = material;
    }
    return this.mesh.material;
  }

  getActiveMaterial(): Material {
    return this[$materials].get(this[$activeMaterialIdx])!;
  }

  async enableVariant(name: string|
                      null): Promise<ThreeMaterial|ThreeMaterial[]|null> {
    if (name == null) {
      return this.setActiveMaterial(this[$initialMaterialIdx]);
    }
    if (this[$variantInfo] != null) {
      const material = this[$variantInfo].get(name);
      if (material != null) {
        return this.setActiveMaterial(material.index);
      }
    }
    return null;
  }

  async instantiateVariants() {
    if (this[$variantInfo] == null) {
      return;
    }
    for (const name of this[$variantInfo].keys()) {
      if (this.mesh.userData.variantMaterials.get(name).material != null) {
        continue;
      }
      const threeMaterial = await this.enableVariant(name);
      if (threeMaterial != null) {
        this.mesh.userData.variantMaterials.get(name).material = threeMaterial;
      }
    }
  }

  get variantInfo() {
    return this[$variantInfo];
  }
}
