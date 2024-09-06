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

import {Intersection, Material as ThreeMaterial, Mesh, MeshPhysicalMaterial, Object3D} from 'three';

import {CorrelatedSceneGraph, GLTFElementToThreeObjectMap} from '../../three-components/gltf-instance/correlated-scene-graph.js';
import {GLTF, GLTFElement} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Model as ModelInterface} from './api.js';
import {$setActive, $variantIndices, Material} from './material.js';
import {Node, PrimitiveNode} from './nodes/primitive-node.js';
import {$correlatedObjects} from './three-dom-element.js';



export const $materials = Symbol('materials');
const $hierarchy = Symbol('hierarchy');
const $roots = Symbol('roots');
export const $primitivesList = Symbol('primitives');
export const $loadVariant = Symbol('loadVariant');
export const $prepareVariantsForExport = Symbol('prepareVariantsForExport');
export const $switchVariant = Symbol('switchVariant');
export const $materialFromPoint = Symbol('materialFromPoint');
export const $nodeFromPoint = Symbol('nodeFromPoint');
export const $nodeFromIndex = Symbol('nodeFromIndex');
export const $variantData = Symbol('variantData');
export const $availableVariants = Symbol('availableVariants');
const $modelOnUpdate = Symbol('modelOnUpdate');
const $cloneMaterial = Symbol('cloneMaterial');

// Holds onto temporary scene context information needed to perform lazy loading
// of a resource.
export class LazyLoader {
  gltf: GLTF;
  gltfElementMap: GLTFElementToThreeObjectMap;
  mapKey: GLTFElement;
  doLazyLoad: () => Promise<ThreeMaterial>;
  constructor(
      gltf: GLTF, gltfElementMap: GLTFElementToThreeObjectMap,
      mapKey: GLTFElement, doLazyLoad: () => Promise<ThreeMaterial>) {
    this.gltf = gltf;
    this.gltfElementMap = gltfElementMap;
    this.mapKey = mapKey;
    this.doLazyLoad = doLazyLoad;
  }
}

/**
 * Facades variant mapping data.
 */
export interface VariantData {
  name: string;
  index: number;
}

/**
 * A Model facades the top-level GLTF object returned by Three.js' GLTFLoader.
 * Currently, the model only bothers itself with the materials in the Three.js
 * scene graph.
 */
export class Model implements ModelInterface {
  private[$materials] = new Array<Material>();
  private[$hierarchy] = new Array<Node>();
  private[$roots] = new Array<Node>();
  private[$primitivesList] = new Array<PrimitiveNode>();
  private[$modelOnUpdate]: () => void = () => {};
  private[$variantData] = new Map<string, VariantData>();

  constructor(
      correlatedSceneGraph: CorrelatedSceneGraph,
      onUpdate: () => void = () => {}) {
    this[$modelOnUpdate] = onUpdate;
    const {gltf, threeGLTF, gltfElementMap} = correlatedSceneGraph;

    for (const [i, material] of gltf.materials!.entries()) {
      const correlatedMaterial =
          gltfElementMap.get(material) as Set<MeshPhysicalMaterial>| null;

      if (correlatedMaterial != null) {
        this[$materials].push(new Material(
            onUpdate,
            i,
            true,
            this[$variantData],
            correlatedMaterial,
            material.name));
      } else {
        const elementArray = gltf['materials'] || [];
        const gltfMaterialDef = elementArray[i];

        const threeMaterialSet = new Set<MeshPhysicalMaterial>();
        gltfElementMap.set(gltfMaterialDef, threeMaterialSet);
        const materialLoadCallback = async () => {
          const threeMaterial = await threeGLTF.parser.getDependency(
                                    'material', i) as MeshPhysicalMaterial;
          threeMaterialSet.add(threeMaterial);

          return threeMaterial;
        };

        // Configures the material for lazy loading.
        this[$materials].push(new Material(
            onUpdate,
            i,
            false,
            this[$variantData],
            threeMaterialSet,
            material.name,
            new LazyLoader(
                gltf, gltfElementMap, gltfMaterialDef, materialLoadCallback)));
      }
    }

    // Creates a hierarchy of Nodes. Allows not just for switching which
    // material is applied to a mesh but also exposes a way to provide API
    // for switching materials and general assignment/modification.

    // Prepares for scene iteration.
    const parentMap = new Map<object, Node>();
    const nodeStack = new Array<Object3D>();
    for (const object of threeGLTF.scene.children) {
      nodeStack.push(object);
    }

    // Walks the hierarchy and creates a node tree.
    while (nodeStack.length > 0) {
      const object = nodeStack.pop()!;

      let node: Node|null = null;

      if (object instanceof Mesh) {
        node = new PrimitiveNode(
            object as Mesh,
            this.materials,
            this[$variantData],
            correlatedSceneGraph);
        this[$primitivesList].push(node as PrimitiveNode);
      } else {
        node = new Node(object.name);
      }

      const parent: Node|undefined = parentMap.get(object);
      if (parent != null) {
        parent.children.push(node);
      } else {
        this[$roots].push(node);
      }
      this[$hierarchy].push(node);

      for (const child of object.children) {
        nodeStack.push(child);
        parentMap.set(object, node);
      }
    }
  }

  /**
   * Materials are listed in the order of the GLTF materials array, plus a
   * default material at the end if one is used.
   *
   * TODO(#1003): How do we handle non-active scenes?
   */
  get materials(): Material[] {
    return this[$materials];
  }

  [$availableVariants]() {
    const variants = Array.from(this[$variantData].values());
    variants.sort((a, b) => {
      return a.index - b.index;
    });

    return variants.map((data) => {
      return data.name;
    });
  }

  getMaterialByName(name: string): Material|null {
    const matches = this[$materials].filter(material => {
      return material.name === name;
    });

    if (matches.length > 0) {
      return matches[0];
    }
    return null;
  }

  [$nodeFromIndex](mesh: number, primitive: number): PrimitiveNode|null {
    const found = this[$hierarchy].find((node: Node) => {
      if (node instanceof PrimitiveNode) {
        const {meshes, primitives} = node.mesh.userData.associations;
        if (meshes == mesh && primitives == primitive) {
          return true;
        }
      }
      return false;
    });
    return found == null ? null : found as PrimitiveNode;
  }

  [$nodeFromPoint](hit: Intersection<Object3D>): PrimitiveNode {
    return this[$hierarchy].find((node: Node) => {
      if (node instanceof PrimitiveNode) {
        const primitive = node as PrimitiveNode;
        if (primitive.mesh === hit.object) {
          return true;
        }
      }
      return false;
    }) as PrimitiveNode;
  }

  /**
   * Intersects a ray with the Model and returns the first material whose
   * object was intersected.
   */
  [$materialFromPoint](hit: Intersection<Object3D>): Material {
    return this[$nodeFromPoint](hit).getActiveMaterial();
  }

  /**
   * Switches model variant to the variant name provided, or switches to
   * default/initial materials if 'null' is provided.
   */
  async[$switchVariant](variantName: string|null) {
    for (const primitive of this[$primitivesList]) {
      await primitive.enableVariant(variantName);
    }

    for (const material of this.materials) {
      material[$setActive](false);
    }
    // Marks the materials that are now in use after the variant switch.
    for (const primitive of this[$primitivesList]) {
      this.materials[primitive.getActiveMaterial().index][$setActive](true);
    }
  }

  async[$prepareVariantsForExport]() {
    const promises = new Array<Promise<void>>();
    for (const primitive of this[$primitivesList]) {
      promises.push(primitive.instantiateVariants());
    }
    await Promise.all(promises);
  }

  [$cloneMaterial](index: number, newMaterialName: string): Material {
    const material = this.materials[index];

    if (!material.isLoaded) {
      console.error(`Cloning an unloaded material,
           call 'material.ensureLoaded() before cloning the material.`);
    }

    const threeMaterialSet =
        material[$correlatedObjects] as Set<MeshPhysicalMaterial>;

    const clonedSet = new Set<MeshPhysicalMaterial>();
    for (const [i, threeMaterial] of threeMaterialSet.entries()) {
      const clone = threeMaterial.clone() as MeshPhysicalMaterial;
      clone.name =
          newMaterialName + (threeMaterialSet.size > 1 ? '_inst' + i : '');
      clonedSet.add(clone);
    }

    const clonedMaterial = new Material(
        this[$modelOnUpdate],
        this[$materials].length,
        false,  // Cloned as inactive.
        this[$variantData],
        clonedSet,
        newMaterialName);

    this[$materials].push(clonedMaterial);

    return clonedMaterial;
  }

  createMaterialInstanceForVariant(
      originalMaterialIndex: number, newMaterialName: string,
      variantName: string, activateVariant: boolean = true): Material|null {
    let variantMaterialInstance: Material|null = null;

    for (const primitive of this[$primitivesList]) {
      const variantData = this[$variantData].get(variantName);
      // Skips the primitive if the variant already exists.
      if (variantData != null && primitive.variantInfo.has(variantData.index)) {
        continue;
      }

      // Skips the primitive if the source/original material does not exist.
      if (primitive.getMaterial(originalMaterialIndex) == null) {
        continue;
      }

      if (!this.hasVariant(variantName)) {
        this.createVariant(variantName);
      }

      if (variantMaterialInstance == null) {
        variantMaterialInstance =
            this[$cloneMaterial](originalMaterialIndex, newMaterialName);
      }
      primitive.addVariant(variantMaterialInstance, variantName)
    }

    if (activateVariant && variantMaterialInstance != null) {
      (variantMaterialInstance as Material)[$setActive](true);
      this.materials[originalMaterialIndex][$setActive](false);
      for (const primitive of this[$primitivesList]) {
        primitive.enableVariant(variantName);
      }
    }

    return variantMaterialInstance;
  }

  createVariant(variantName: string) {
    if (!this[$variantData].has(variantName)) {
      // Adds the name if it's not already in the list.
      this[$variantData].set(
          variantName,
          {name: variantName, index: this[$variantData].size} as VariantData);
    } else {
      console.warn(`Variant '${variantName}'' already exists`);
    }
  }

  hasVariant(variantName: string) {
    return this[$variantData].has(variantName);
  }

  setMaterialToVariant(materialIndex: number, targetVariantName: string) {
    if (this[$availableVariants]().find(name => name === targetVariantName) ==
        null) {
      console.warn(`Can't add material to '${
          targetVariantName}', the variant does not exist.'`);
      return;
    }

    if (materialIndex < 0 || materialIndex >= this.materials.length) {
      console.error(`setMaterialToVariant(): materialIndex is out of bounds.`);
      return;
    }

    for (const primitive of this[$primitivesList]) {
      const material = primitive.getMaterial(materialIndex);
      // Ensures the material exists on the primitive before setting it to a
      // variant.
      if (material != null) {
        primitive.addVariant(material, targetVariantName);
      }
    }
  }

  updateVariantName(currentName: string, newName: string) {
    const variantData = this[$variantData].get(currentName);
    if (variantData == null) {
      return;
    }
    variantData.name = newName;
    this[$variantData].set(newName, variantData!);
    this[$variantData].delete(currentName);
  }

  deleteVariant(variantName: string) {
    const variant = this[$variantData].get(variantName);
    if (variant == null) {
      return;
    }

    for (const material of this.materials) {
      if (material.hasVariant(variantName)) {
        material[$variantIndices].delete(variant.index);
      }
    }

    for (const primitive of this[$primitivesList]) {
      primitive.deleteVariant(variant.index);
    }

    this[$variantData].delete(variantName);
  }
}
