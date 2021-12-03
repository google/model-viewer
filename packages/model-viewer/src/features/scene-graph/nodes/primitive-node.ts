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
import {VariantData} from '../model.js';
import {$sourceObject} from '../three-dom-element.js';



const $materials = Symbol('materials');
const $variantToMaterialMap = Symbol('variantToMaterialMap');
const $modelVariants = Symbol('modelVariants');
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
  // Maps variant number to material index.
  private[$variantToMaterialMap] = new Map<number, Material>();
  private[$initialMaterialIdx]: number;
  private[$activeMaterialIdx]: number;
  private[$modelVariants]: Map<string, VariantData>;

  constructor(
      mesh: Mesh, mvMaterials: Material[],
      modelVariants: Map<string, VariantData>,
      correlatedSceneGraph: CorrelatedSceneGraph) {
    super(mesh.name);
    this[$mesh] = mesh;
    const {gltf, threeGLTF, threeObjectMap} = correlatedSceneGraph;
    this[$modelVariants] = modelVariants;
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
            this[$variantToMaterialMap].set(variant, mvMaterial);
            // Provides variant info for material self lookup.
            mvMaterial.variants.add(name);
            // Updates the models variant data.
            if (!modelVariants.has(name)) {
              modelVariants.set(name, new VariantData(name, variant));
            }
            modelVariants.get(name)!.materialVariants.push(mvMaterial.index);
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
    if (this[$variantToMaterialMap] != null && this[$modelVariants].has(name)) {
      const modelVariants = this[$modelVariants].get(name)!;
      return this.enableVariantHelper(modelVariants.index);
    }
    return null;
  }

  private async enableVariantHelper(index: number|null):
      Promise<ThreeMaterial|ThreeMaterial[]|null> {
    if (this[$variantToMaterialMap] != null && index != null) {
      const material = this[$variantToMaterialMap].get(index);
      if (material != null) {
        return this.setActiveMaterial(material.index);
      }
    }
    return null;
  }

  async instantiateVariants() {
    if (this[$variantToMaterialMap] == null) {
      return;
    }
    for (const index of this[$variantToMaterialMap].keys()) {
      if (this.mesh.userData.variantMaterials.get(index).material != null) {
        continue;
      }
      const threeMaterial = await this.enableVariantHelper(index);
      if (threeMaterial != null) {
        this.mesh.userData.variantMaterials.get(index).material = threeMaterial;
      }
    }
  }

  get variantInfo() {
    return this[$variantToMaterialMap];
  }

  addMaterialToVariant(materialIndex: number, variantName: string) {
    if (!this.validateMaterial(materialIndex) ||
        !this.ensureVariantIsUnused(variantName)) {
      return;
    }
    const modelVariantData = this[$modelVariants].get(variantName)!;
    const variantIndex = modelVariantData.index;

    // Updates materials mapped to the variant.
    modelVariantData.materialVariants.push(materialIndex);

    // Updates internal mappings.
    const material = this.getMaterial(materialIndex)!;
    material.variants.add(variantIndex);
    this.variantInfo.set(variantIndex, material);

    this.updateVariantUserData(
        variantIndex, this[$materials].get(materialIndex)!);
  }

  addVariant(materialVariant: Material, variantName: string) {
    if (!this.ensureVariantIsUnused(variantName)) {
      return false;
    }

    // Adds the variant to the model variants if needed.
    if (!this[$modelVariants].has(variantName)) {
      this[$modelVariants].set(
          variantName, new VariantData(variantName, this[$modelVariants].size));
    }
    const modelVariantData = this[$modelVariants].get(variantName)!;
    const variantIndex = modelVariantData.index;

    // Updates materials mapped to the variant.
    modelVariantData.materialVariants.push(variantIndex);

    // Updates internal mappings.
    this[$variantToMaterialMap].set(variantIndex, materialVariant);
    this[$materials].set(variantIndex, materialVariant);

    this.updateVariantUserData(variantIndex, materialVariant);

    return true;
  }

  private updateVariantUserData(variantIndex: number, variant: Material) {
    // Adds variants name to material variants set.
    variant.variants.add(variantIndex);

    // Updates import data (see VariantMaterialLoaderPlugin.ts).
    this.mesh.userData.variantMaterials = this.mesh.userData.variantMaterials ||
        new Map<number, UserDataVariantMapping>();
    const map = this.mesh.userData.variantMaterials! as
        Map<number, UserDataVariantMapping>;
    map.set(variantIndex, {
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

  private ensureVariantIsUnused(variantName: string) {
    const modelVariants = this[$modelVariants].get(variantName);

    if (modelVariants != null && this.variantInfo.has(modelVariants!.index)) {
      console.warn(`Primitive cannot add variant '${
          variantName}' for this material, it already exists.`);
      return false;
    }

    return true;
  }
}
