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

import {Material as ThreeMaterial, Mesh, MeshStandardMaterial} from 'three';

import {CorrelatedSceneGraph, GLTFElementToThreeObjectMap, ThreeObjectSet, UserDataAssociations} from '../../three-components/gltf-instance/correlated-scene-graph.js';
import {GLTF, GLTFElement, Scene} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Model as ModelInterface} from './api.js';
import {Material} from './material.js';
import {$primitives, $threeNode, MVMesh, MVNode, MVPrimitive} from './nodes/primitive-node.js';



export const $materials = Symbol('materials');
export const $primitivesList = Symbol('primitives');
export const $loadVariant = Symbol('loadVariant');
export const $correlatedSceneGraph = Symbol('correlatedSceneGraph');
export const $prepareVariantsForExport = Symbol('prepareVariantsForExport');
export const $switchVariant = Symbol('switchVariant');
export const $roots = Symbol('roots');
export const $hierarchy = Symbol('hierarchy');


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
  private[$primitivesList] = new Array<MVPrimitive>();
  private[$roots] = new Array<MVNode>();
  private[$hierarchy] = new Array<MVNode>();
  constructor(
      sceneIndex: number, correlatedSceneGraph: CorrelatedSceneGraph,
      onUpdate: () => void = () => {}) {
    const {gltf, threeGLTF, gltfElementMap} = correlatedSceneGraph;

    if (gltf.scenes == null || sceneIndex >= gltf.scenes.length) {
      console.warn(`Cannot create model for scene: ${
          sceneIndex}, scene data does not exist.`);
      return;
    }

    for (const [i, material] of gltf.materials!.entries()) {
      const correlatedMaterial =
          gltfElementMap.get(material) as Set<MeshStandardMaterial>;

      if (correlatedMaterial != null) {
        this[$materials].push(
            new Material(onUpdate, gltf, material, correlatedMaterial));
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
            correlatedMaterial,
            new LazyLoader(
                gltf, gltfElementMap, gltfMaterialDef, materialLoadCallback)));
      }
    }

    // Creates a hierarchy of MVNodes. Allows not just for switching which
    // material is applied to a mesh but also exposes a way to provide API for
    // switching materials and general assignment/modification.

    const gltfScene = gltf.scenes![sceneIndex] as Scene;
    // Prepares root nodes of the scene.
    const stack = gltfScene.nodes.map(index => {
      const node = gltf.nodes![index];
      const associationsSet = gltfElementMap.get(node);
      const threeObject = associationsSet!.values().next().value;
      const nodesIdx =
          (threeObject as UserDataAssociations).userData.associations!.nodes!;
      const mvNode = new MVNode(node.name!, nodesIdx, threeObject);
      this[$roots].push(mvNode);
      return mvNode;
    });

    while (stack.length > 0) {
      const mvNode = stack.pop() as MVNode;
      this[$hierarchy].push(mvNode);

      const threeObject = mvNode[$threeNode];
      const node = gltf.nodes![mvNode.nodesIndex];

      if (threeObject == null) {
        console.error('No associations found for node');
        continue;
      }

      let nodeIsAlsoMesh = false;
      if ((threeObject as Mesh).isMesh) {
        nodeIsAlsoMesh = true;
      }

      // Attaches an MVMesh to the MVNode and adds MVPrimitives for each three
      // mesh.
      if (node.mesh != null) {
        mvNode.mesh = new MVMesh(gltf.meshes![node.mesh].name, node.mesh);
        if (nodeIsAlsoMesh) {
          const primitiveIdx = (threeObject as UserDataAssociations)
                                   .userData.associations!.primitives;
          mvNode.mesh[$primitives][primitiveIdx] = new MVPrimitive(
              threeObject as Mesh, this.materials, correlatedSceneGraph);
        } else {
          for (const child of threeObject.children) {
            if ((child as Mesh).isMesh) {
              const primitiveIdx = (child as UserDataAssociations)
                                       .userData.associations!.primitives;
              mvNode.mesh[$primitives][primitiveIdx] = new MVPrimitive(
                  child as Mesh, this.materials, correlatedSceneGraph);
            }
          }
        }

        for (const primitive of mvNode.mesh[$primitives]) {
          this[$primitivesList].push(primitive);
        }
      }

      if (gltf.nodes![mvNode.nodesIndex].children) {
        const children = gltf.nodes![mvNode.nodesIndex].children!;
        for (const child of children) {
          const gltfNode = gltf.nodes![child];
          const threeNode = gltfElementMap.get(gltfNode)!.values().next().value;
          stack.push(new MVNode(gltfNode.name!, child, threeNode, mvNode));
        }
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
  }

  async[$prepareVariantsForExport]() {
    const promises = new Array<Promise<void>>();
    for (const primitive of this[$primitivesList]) {
      promises.push(primitive.instantiateVariants());
    }
    await Promise.all(promises);
  }
}
