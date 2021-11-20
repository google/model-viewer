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
import {$cloneAndPatchMaterial, ModelViewerGLTFInstance} from '../../three-components/gltf-instance/ModelViewerGLTFInstance.js';

import {Model as ModelInterface} from './api.js';
import {$setActive, Material} from './material.js';
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
const $modelOnUpdate = Symbol('modelOnUpdate');
const $variants = Symbol('variants');
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
  private[$variants] = new Array<string>();

  constructor(
      correlatedSceneGraph: CorrelatedSceneGraph,
      onUpdate: () => void = () => {}) {
    this[$modelOnUpdate] = onUpdate;
    this[$correlatedSceneGraph] = correlatedSceneGraph;
    const {gltf, threeGLTF, gltfElementMap} = correlatedSceneGraph;
    this[$threeScene] = threeGLTF.scene;

    if (threeGLTF.userData.variants != null) {
      this[$variants] = threeGLTF.userData.variants.slice();
    }

    for (const [i, material] of gltf.materials!.entries()) {
      const correlatedMaterial =
          gltfElementMap.get(material) as Set<MeshStandardMaterial>;

      if (correlatedMaterial != null) {
        this[$materials].push(new Material(
            onUpdate, gltf, material, i, true, correlatedMaterial));
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
            object as Mesh, this.materials, correlatedSceneGraph);
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

  availableVariants() {
    return this[$variants];
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
    const promises = new Array<Promise<ThreeMaterial|ThreeMaterial[]|null>>();
    for (const primitive of this[$primitivesList]) {
      promises.push(primitive.enableVariant(variantName));
    }

    await Promise.all(promises);

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

    const clonedSet = new Set<MeshStandardMaterial>();
    for (const [i, threeMaterial] of threeMaterialSet.entries()) {
      const clone = ModelViewerGLTFInstance[$cloneAndPatchMaterial](
                        threeMaterial) as MeshStandardMaterial;
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
        clonedSet);

    this[$materials].push(clonedMaterial);

    return clonedMaterial;
  }

  createVariantFromMaterial(
      originalMaterialIndex: number, newMaterialName: string,
      variantName: string, activateVariant: boolean = true): Material|null {
    const variantMaterial =
        this[$cloneMaterial](originalMaterialIndex, newMaterialName);

    let created = false;
    for (const primitive of this[$primitivesList]) {
      // Skips the primitive if the variant already exists.
      if (primitive.variantInfo.has(variantName)) {
        continue;
      }

      // Skips the primitive if the source/original material does not exist
      // here.
      if (primitive.getMaterial(originalMaterialIndex) == null) {
        continue;
      }

      if (primitive.addVariant(variantMaterial, variantName)) {
        created = true;
      }
    }

    if (!created) {
      return null;
    }

    this.createVariant(variantName);

    if (activateVariant) {
      variantMaterial[$setActive](true);
      this.materials[originalMaterialIndex][$setActive](false);
    }

    return variantMaterial;
  }

  createVariant(variantName: string) {
    // Updates the variants list in user data.
    const threeGLTF = this[$correlatedSceneGraph].threeGLTF;
    threeGLTF.userData.variants =
        threeGLTF.userData.variants || new Array<string>();
    const variants = threeGLTF.userData.variants as string[];

    const found = variants.find(name => name === variantName);
    if (found == null) {
      variants.push(variantName);
      // Updates variant names seen by the rest of ModelViewer.
      this[$variants] = variants.slice();
    } else {
      console.warn(`Variant '${variantName}'' already exists`);
    }
  }

  addMaterialToVariant(materialIndex: number, targetVariantName: string) {
    if (this[$variants].find(name => name === targetVariantName) == null) {
      console.warn(`Can't add material to '${
          targetVariantName}', the variant does not exist.'`);
      return;
    }

    if (materialIndex < 0 || materialIndex >= this.materials.length) {
      console.error(`addMaterialToVariant(): materialIndex is out of bounds.`);
      return;
    }

    for (const primitive of this[$primitivesList]) {
      const material = primitive.getMaterial(materialIndex);
      if (material != null) {
        primitive.addMaterialToVariant(material.index, targetVariantName);
      }
    }
  }
}
