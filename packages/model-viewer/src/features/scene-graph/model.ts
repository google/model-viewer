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

import {Group, Intersection, Material as ThreeMaterial, Mesh, MeshStandardMaterial, Object3D, Raycaster} from 'three';

import {CorrelatedSceneGraph, GLTFElementToThreeObjectMap, ThreeObjectSet} from '../../three-components/gltf-instance/correlated-scene-graph.js';
import {GLTF, GLTFElement, Material as GLTFMaterial} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Model as ModelInterface} from './api.js';
import {$setActive, $variantSet, Material} from './material.js';
import {$children, Node, PrimitiveNode} from './nodes/primitive-node.js';
import {$correlatedObjects, $sourceObject} from './three-dom-element.js';



export const $materials = Symbol('materials');
const $hierarchy = Symbol('hierarchy');
const $roots = Symbol('roots');
export const $primitivesList = Symbol('primitives');
export const $loadVariant = Symbol('loadVariant');
export const $correlatedSceneGraph = Symbol('correlatedSceneGraph');
export const $prepareVariantsForExport = Symbol('prepareVariantsForExport');
export const $switchVariant = Symbol('switchVariant');
export const $threeScene = Symbol('threeScene');
export const $materialsFromPoint = Symbol('materialsFromPoint');
export const $materialFromPoint = Symbol('materialFromPoint');
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
  doLazyLoad: () => Promise<{set: ThreeObjectSet, material: ThreeMaterial}>;
  constructor(
      gltf: GLTF, gltfElementMap: GLTFElementToThreeObjectMap,
      mapKey: GLTFElement,
      doLazyLoad:
          () => Promise<{set: ThreeObjectSet, material: ThreeMaterial}>) {
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
  private[$threeScene]: Object3D|Group;
  private[$modelOnUpdate]: () => void = () => {};
  private[$correlatedSceneGraph]: CorrelatedSceneGraph;
  private[$variantData] = new Map<string, VariantData>();

  constructor(
      correlatedSceneGraph: CorrelatedSceneGraph,
      onUpdate: () => void = () => {}) {
    this[$modelOnUpdate] = onUpdate;
    this[$correlatedSceneGraph] = correlatedSceneGraph;
    const {gltf, threeGLTF, gltfElementMap} = correlatedSceneGraph;
    this[$threeScene] = threeGLTF.scene;

    for (const [i, material] of gltf.materials!.entries()) {
      const correlatedMaterial =
          gltfElementMap.get(material) as Set<MeshStandardMaterial>;

      if (correlatedMaterial != null) {
        this[$materials].push(new Material(
            onUpdate,
            gltf,
            material,
            i,
            true,
            this[$variantData],
            correlatedMaterial));
      } else {
        const elementArray = gltf['materials'] || [];
        const gltfMaterialDef = elementArray[i];

        // Loads the three.js material.
        const capturedMatIndex = i;
        const materialLoadCallback = async () => {
          const threeMaterial =
              await threeGLTF.parser.getDependency(
                  'material', capturedMatIndex) as MeshStandardMaterial;

          // Adds correlation, maps the variant gltf-def to the
          // three material set containing the variant material.
          const threeMaterialSet = new Set<MeshStandardMaterial>();
          gltfElementMap.set(gltfMaterialDef, threeMaterialSet);
          threeMaterialSet.add(threeMaterial);

          return {set: threeMaterialSet, material: threeMaterial};
        };

        // Configures the material for lazy loading.
        this[$materials].push(new Material(
            onUpdate,
            gltf,
            gltfMaterialDef,
            i,
            false,
            this[$variantData],
            correlatedMaterial,
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
        parent[$children].push(node);
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


  /**
   * Intersects a ray with the Model and returns a list of materials whose
   * objects were intersected.
   */
  [$materialsFromPoint](raycaster: Raycaster): Material[] {
    const hits = raycaster.intersectObject(this[$threeScene], true);

    // Map the object hits to primitives and then to the active material of
    // the primitive.
    return hits.map((hit: Intersection<Object3D>) => {
      const found = this[$hierarchy].find((node: Node) => {
        if (node instanceof PrimitiveNode) {
          const primitive = node as PrimitiveNode;
          if (primitive.mesh === hit.object) {
            return true;
          }
        }
        return false;
      }) as PrimitiveNode;

      if (found != null) {
        return found.getActiveMaterial();
      }
      return null;
    }) as Material[];
  }

  /**
   * Intersects a ray with the Model and returns the first material whose
   * object was intersected.
   */
  [$materialFromPoint](raycaster: Raycaster): Material|null {
    const materials = this[$materialsFromPoint](raycaster);

    if (materials.length > 0) {
      return materials[0];
    }

    return null;
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
        material[$correlatedObjects] as Set<MeshStandardMaterial>;

    // clones the gltf material data and updates the material name.
    const gltfSourceMaterial =
        JSON.parse(JSON.stringify(material[$sourceObject])) as GLTFMaterial;
    gltfSourceMaterial.name = newMaterialName;
    // Adds the source material clone to the gltf def.
    const gltf = this[$correlatedSceneGraph].gltf;
    gltf.materials!.push(gltfSourceMaterial);

    const clonedSet = new Set<MeshStandardMaterial>();
    for (const [i, threeMaterial] of threeMaterialSet.entries()) {
      const clone = threeMaterial.clone() as MeshStandardMaterial;
      clone.name =
          newMaterialName + (threeMaterialSet.size > 1 ? '_inst' + i : '');
      clonedSet.add(clone);
    }

    const clonedMaterial = new Material(
        this[$modelOnUpdate],
        this[$correlatedSceneGraph].gltf,
        gltfSourceMaterial,
        this[$materials].length,
        false,  // Cloned as inactive.
        this[$variantData],
        clonedSet);

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
        material[$variantSet].delete(variant.index);
      }
    }

    for (const primitive of this[$primitivesList]) {
      primitive.deleteVariant(variant.index);
    }

    this[$variantData].delete(variantName);
  }
}
