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
import {UserDataVariantMapping} from '../../../three-components/gltf-instance/VariantMaterialLoaderPlugin.js';
import {$getLoadedMaterial, Material} from '../material.js';
import {$sourceObject} from '../three-dom-element.js';



const $materials = Symbol('materials');
const $variantInfo = Symbol('variantInfo');
const $mesh = Symbol('mesh');
export const $primitives = Symbol('primitives');
export const $loadVariant = Symbol('loadVariant');
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
  [$materials] = new Map<number, Material>();
  // Maps variant name to material index.
  private[$variantInfo] = new Map<string, Material>();
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
        for (const mapping of variantsExtension.mappings) {
          const mvMaterial = mvMaterials[mapping.material];
          // Maps variant indices to Materials.
          this[$materials].set(mapping.material, mvMaterial);
          for (const variant of mapping.variants) {
            const {name} = variantNames[variant];
            this[$variantInfo].set(name, mvMaterial);
            // Provides variant info for material self lookup.
            mvMaterial.variants.add(name);
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

  getMaterial(index: number): Material|undefined {
    return this[$materials].get(index);
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

  addMaterialToVariant(materialIndex: number, variantName: string) {
    if (!this.validateMaterial(materialIndex) ||
        !this.validateVariant(variantName)) {
      return;
    }
    const material = this.getMaterial(materialIndex)!;
    material.variants.add(variantName);
    this.variantInfo.set(variantName, material);

    this.updateVariantUserData(
        variantName, this[$materials].get(materialIndex)!);
  }

  addVariant(variant: Material, variantName: string) {
    if (!this.validateVariant(variantName)) {
      return false;
    }

    this[$variantInfo].set(variantName, variant);
    this[$materials].set(variant.index, variant);

    this.updateVariantUserData(variantName, variant);

    return true;
  }

  private updateVariantUserData(variantName: string, variant: Material) {
    // Adds variants name to material variants set.
    variant.variants.add(variantName);

    // Updates import data (see VariantMaterialLoaderPlugin.ts).
    this.mesh.userData.variantMaterials = this.mesh.userData.variantMaterials ||
        new Map<string, UserDataVariantMapping>();
    const map = this.mesh.userData.variantMaterials! as
        Map<string, UserDataVariantMapping>;
    map.set(variantName, {
      material: (variant[$sourceObject] as ThreeMaterial),
      gltfMaterialIndex: variant.index
    });
  }

  private validateMaterial(materialIndex: number) {
    if (!this[$materials].has(materialIndex)) {
      console.warn(
          `materialIndex ${materialIndex} does not exist on primitive.`);
      return false;
    }
    return true;
  }

  private validateVariant(variantName: string) {
    if (this.variantInfo.has(variantName)) {
      console.warn(`Primitive cannot add variant '${
          variantName}' for this material, it already exists.`);
      return false;
    }
    return true;
  }
}
