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

import {Material as ThreeMaterial, Mesh, MeshStandardMaterial, Object3D} from 'three';
import {GLTFReference} from 'three/examples/jsm/loaders/GLTFLoader';

import {CorrelatedSceneGraph, GLTFElementToThreeObjectMap, ThreeObjectSet} from '../../three-components/gltf-instance/correlated-scene-graph.js';
import {GLTF, GLTFElement, KHRMaterialsVariants, Node as GLTFNode, Primitive} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Model as ModelInterface} from './api.js';
import {$ensureLoaded, Material} from './material.js';



const $materials = Symbol('materials');
const $variantInfo = Symbol('variantInfo');
const $mesh = Symbol('mesh');
const $children = Symbol('children');
const $hierarchy = Symbol('hierarchy');
const $roots = Symbol('roots');
const $primitives = Symbol('primitives');
export const $loadVariant = Symbol('loadVariant');
export const $correlatedSceneGraph = Symbol('correlatedSceneGraph');
export const $ensureAllMaterialsLoaded = Symbol('ensureAllMaterialsLoaded');


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

// Defines the base level node methods and data.
class Node {
  name: string = '';
  [$children] = new Array<Node>();
  constructor(name: string) {
    this.name = name;
  }
}

// Represents a primitive in a glTF mesh.
class PrimitiveNode extends Node {
  private[$mesh]: Mesh;
  // Maps glTF material index number to a material that this primitive supports.
  private[$materials] = new Map<number, Material>();
  // Maps variant name to material index.
  private[$variantInfo]: Map<string, number>;
  // List of child nodes.
  constructor(
      mesh: Mesh, mvMaterials: Material[],
      correlatedSceneGraph: CorrelatedSceneGraph) {
    super(mesh.name);
    this[$mesh] = mesh;
    const {gltf, threeGLTF} = correlatedSceneGraph;

    const gltfMeshReference =
        correlatedSceneGraph.threeObjectMap.get(mesh) as GLTFReference;
    const {type: nodes, index: nodeIndex} = gltfMeshReference;
    if (nodes !== 'nodes') {
      console.error('Expected type \'nodes\' but got ' + nodes);
    }
    // Gets the mesh index from the node.
    const meshIndex = ((gltf[nodes] || []) as GLTFNode[])[nodeIndex].mesh!;
    // The gltf mesh array to sample from.
    const meshElementArray = gltf['meshes'] || [];
    // List of primitives under the mesh.
    const gltfPrimitives =
        (meshElementArray[meshIndex].primitives || []) as Primitive[];

    for (const primitive of gltfPrimitives) {
      // Maps the primitive default to a material.
      this[$materials].set(
          primitive.material!, mvMaterials[primitive.material!]);

      if (primitive.extensions &&
          primitive.extensions['KHR_materials_variants']) {
        const variantsExtension =
            primitive.extensions['KHR_materials_variants'] as
            KHRMaterialsVariants;
        const extensions = threeGLTF.parser.json.extensions;
        const variantNames = extensions['KHR_materials_variants'].variants;
        // Provides definition now that we know there are variants to support.
        this[$variantInfo] = new Map<string, number>();
        for (const mapping of variantsExtension.mappings!) {
          // Maps variant indices to Materials.
          this[$materials].set(mapping.material, mvMaterials[mapping.material]);
          for (const variant of mapping.variants) {
            const {name} = variantNames[variant];
            this[$variantInfo].set(name, mapping.material);
          }
        }
      }
    }
  }

  get mesh() {
    return this[$mesh];
  }

  async setActiveMaterial(index: number) {
    const mvMaterial = this[$materials].get(index);
    if (mvMaterial != null) {
      this.mesh.material = await mvMaterial[$ensureLoaded]();
    }
  }

  async enableVariant(name: string) {
    if (this[$variantInfo] != null) {
      const index = this[$variantInfo].get(name);
      if (index != null) {
        this.setActiveMaterial(index);
      }
    }
  }
}

/**
 * A Model facades the top-level GLTF object returned by Three.js' GLTFLoader.
 * Currently, the model only bothers itself with the materials in the Three.js
 * scene graph.
 */
export class Model implements ModelInterface {
  private[$materials]: Material[] = new Array<Material>();
  private[$hierarchy] = new Array<Node>();
  private[$roots] = new Array<Node>();
  private[$primitives] = new Array<PrimitiveNode>();

  constructor(
      correlatedSceneGraph: CorrelatedSceneGraph,
      onUpdate: () => void = () => {}) {
    const {gltf, threeGLTF, gltfElementMap} = correlatedSceneGraph;

    let i = 0;
    for (const material of gltf.materials!) {
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
      i++;
    }

    // Creates a hierarchy of Nodes. Allows not just for switching which
    // material is applied to a mesh but also exposes a way to provide API for
    // switching materials and general assignment/modification.

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
        this[$primitives].push(node as PrimitiveNode);
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

  async switchVariant(variantName: string): Promise<void> {
    const promises = new Array<Promise<void>>();
    for (const primitive of this[$primitives]) {
      promises.push(primitive.enableVariant(variantName));
    }
    await Promise.all(promises);
  }

  async[$ensureAllMaterialsLoaded]() {
    const promises = new Array<Promise<MeshStandardMaterial>>();
    for (const material of this.materials) {
      promises.push(material[$ensureLoaded]());
    }
    await Promise.all(promises);
  }
}
