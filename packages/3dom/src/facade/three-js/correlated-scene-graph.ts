import {Group, Material, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Scene} from 'three';
import {GLTF as ThreeGLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {GLTF, GLTFElement} from '../../gltf-2.0.js';
import {GLTFTreeVisitor} from '../../utilities.js';

/**
 * ThreeGLTFParserCache gives us a valid type for an as-yet untyped part of the
 * Three.js GLTFParser API. It is basically a Map-like object that maps string
 * keys in the form of "$ELEMENT_TYPE:$INDEX" to promises for corresponding
 * Three.js constructs.
 */
interface ThreeGLTFParserCache {
  get(key: string):
      Promise<MeshStandardMaterial|MeshPhysicalMaterial|Mesh|Object3D|Scene>;
}

export type ThreeSceneObject = Object3D|Material;
type ThreeSceneObjectCallback = (a: ThreeSceneObject, b: ThreeSceneObject) =>
    void;

export interface GLTFElementHandle {
  key: Exclude<keyof GLTF, 'scene'>;
  element: GLTFElement;
}

export type ThreeObjectList = ThreeSceneObject[];

export type GLTFElementToThreeObjectMap = Map<GLTFElement, ThreeObjectList>;
export type ThreeObjectToGLTFElementHandleMap =
    Map<Object3D|Material, GLTFElementHandle>;

const $threeGLTF = Symbol('threeGLTF');
const $gltf = Symbol('gltf');
const $gltfElementMap = Symbol('gltfElementMap');
const $threeObjectMap = Symbol('threeObjectMap');
const $correlateSceneGraphs = Symbol('correlatedSceneGraphs');
const $parallelTraverseThreeScene = Symbol('parallelTraverseThreeScene');

/**
 * The Three.js GLTFLoader provides us with an in-memory representation
 * of a glTF in terms of Three.js constructs. It also provides us with a copy
 * of the deserialized glTF without any Three.js decoration, and a mapping of
 * glTF elements to their corresponding Three.js constructs.
 *
 * A CorrelatedSceneGraph exposes a synchronously available mapping of glTF
 * element references to their corresponding Three.js constructs.
 */
export class CorrelatedSceneGraph {
  /**
   * Maps the elements of a glTF to corresponding Three.js constructs. This
   * helper is async because the related Three.js constructs are cached behind
   * promises. In practice, the asynchrony should last no longer than a
   * microtask.
   */
  private static async[$correlateSceneGraphs](threeGLTF: ThreeGLTF, gltf: GLTF):
      Promise<
          [ThreeObjectToGLTFElementHandleMap, GLTFElementToThreeObjectMap]> {
    const {cache} =
        (threeGLTF.parser as unknown as {cache: ThreeGLTFParserCache});
    const gltfElementMap: GLTFElementToThreeObjectMap = new Map();
    const threeObjectMap: ThreeObjectToGLTFElementHandleMap = new Map();

    const pendingObjectLookups: Promise<unknown>[] = [];

    const visitor = new GLTFTreeVisitor({
      material: (material, index) => {
        pendingObjectLookups.push(
            (cache.get(`material:${index}`) as Promise<MeshStandardMaterial>)
                .then((threeMaterial: MeshStandardMaterial) => {
                  const threeObjects = [threeMaterial];
                  gltfElementMap.set(material, threeObjects);
                  threeObjectMap.set(
                      threeMaterial, {key: 'materials', element: material});
                }));
      }
    });

    visitor.visit(gltf);

    await Promise.all(pendingObjectLookups);

    return [threeObjectMap, gltfElementMap];
  }

  // private static async collectClonedMaterials(
  //     originalMaterial: MeshStandardMaterial, cache: ThreeGLTFParserCache) {
  //   const keyParts = [
  //     `ClonedMaterial:${originalMaterial.uuid}:`,
  //     'skinning:',
  //     'vertex-tangents:',
  //     'vertex-colors:',
  //     'flat-shading:',
  //     'morph-targets:',
  //     'morph-normals:'
  //   ];
  //   const materials: Material[] = [];
  //   const keyCombinations = [''];
  //   let currentKey = '';

  //   for (let i = 0; i < keyParts.length; ++i) {
  //     currentKey += keyParts[i];
  //     for (let j = i + 1; j < keyParts.length; ++j) {
  //       const material = await cache.get(`${currentKey}${keyParts[j]}`);
  //       if (material != null && (material as Material).isMaterial) {
  //         materials.push(material as Material);
  //       }
  //     }
  //   }

  //   return materials;
  // }

  /**
   * Produce a CorrelatedSceneGraph from a naturally generated Three.js GLTF.
   * Such GLTFs are produced by Three.js' GLTFLoader, and contain cached
   * details that expedite the correlation step.
   */
  static async from(threeGLTF: ThreeGLTF): Promise<CorrelatedSceneGraph> {
    // const gltf: GLTF =
    //     JSON.parse(JSON.stringify(threeGLTF.parser.json)) as GLTF;
    const gltf = threeGLTF.parser.json as GLTF;
    const [threeObjectMap, gltfElementMap] =
        await this[$correlateSceneGraphs](threeGLTF, gltf);
    return new CorrelatedSceneGraph(
        threeGLTF, gltf, threeObjectMap, gltfElementMap);
  }

  private[$threeGLTF]: ThreeGLTF;
  private[$gltf]: GLTF;
  private[$gltfElementMap]: GLTFElementToThreeObjectMap;
  private[$threeObjectMap]: ThreeObjectToGLTFElementHandleMap;

  /**
   * The source Three.js GLTF result given to us by a Three.js GLTFLoader.
   */
  get threeGLTF() {
    return this[$threeGLTF];
  }

  /**
   * The in-memory deserialized source glTF.
   */
  get gltf() {
    return this[$gltf];
  }

  /**
   * A Map of glTF element references to arrays of corresponding Three.js
   * object references. Three.js objects are kept in arrays to account for
   * cases where more than one Three.js object corresponds to a single glTF
   * element.
   */
  get gltfElementMap() {
    return this[$gltfElementMap];
  }

  /**
   * A map of individual Three.js objects to corresponding elements in the
   * source glTF.
   */
  get threeObjectMap() {
    return this[$threeObjectMap];
  }

  constructor(
      threeGLTF: ThreeGLTF, gltf: GLTF,
      threeObjectMap: ThreeObjectToGLTFElementHandleMap,
      gltfElementMap: GLTFElementToThreeObjectMap) {
    this[$threeGLTF] = threeGLTF;
    this[$gltf] = gltf;
    this[$gltfElementMap] = gltfElementMap;
    this[$threeObjectMap] = threeObjectMap;
  }

  /**
   * Transfers the association between a raw glTF and a Three.js scene graph
   * to a clone of the Three.js scene graph, resolved as a new
   * CorrelatedsceneGraph instance.
   */
  correlateClone(cloneThreeGLTF: ThreeGLTF): CorrelatedSceneGraph {
    const originalThreeGLTF = this[$threeGLTF];
    const originalGLTF = this.gltf;
    const cloneGLTF: GLTF = JSON.parse(JSON.stringify(originalGLTF));
    const cloneThreeObjectMap: ThreeObjectToGLTFElementHandleMap = new Map();
    const cloneGLTFELementMap: GLTFElementToThreeObjectMap = new Map();

    for (let i = 0; i < originalThreeGLTF.scenes.length; i++) {
      this[$parallelTraverseThreeScene](
          originalThreeGLTF.scenes[i],
          cloneThreeGLTF.scenes[i],
          (object: ThreeSceneObject, cloneObject: ThreeSceneObject) => {
            const elementHandle = this.threeObjectMap.get(object);

            if (elementHandle != null) {
              const {key, element} = elementHandle;
              const elementList = originalGLTF[key] as (typeof element)[];
              const elementIndex = elementList.indexOf(element);

              const cloneElementList = cloneGLTF[key] as (typeof element)[];
              const cloneElement = cloneElementList[elementIndex];

              cloneThreeObjectMap.set(
                  cloneObject, {key, element: cloneElement});
              const cloneObjects: (typeof cloneObject)[] =
                  cloneGLTFELementMap.get(cloneElement) || [];
              cloneObjects.push(cloneObject);

              cloneGLTFELementMap.set(cloneElement, cloneObjects);
            }
          });
    }

    return new CorrelatedSceneGraph(
        cloneThreeGLTF, cloneGLTF, cloneThreeObjectMap, cloneGLTFELementMap);
  }

  /**
   * Traverses two presumably identical Three.js scenes, and invokes a callback
   * for each Object3D or Material encountered, including the initial scene.
   * Adapted from
   * https://github.com/mrdoob/three.js/blob/7c1424c5819ab622a346dd630ee4e6431388021e/examples/jsm/utils/SkeletonUtils.js#L586-L596
   */
  private[$parallelTraverseThreeScene](
      sceneOne: Group, sceneTwo: Group, callback: ThreeSceneObjectCallback) {
    const isMesh = (object: unknown): object is Mesh => {
      return (object as Mesh).isMesh;
    };
    const traverse = (a: ThreeSceneObject, b: ThreeSceneObject) => {
      callback(a, b);

      if ((a as Object3D).isObject3D) {
        if (isMesh(a)) {
          if (Array.isArray(a.material)) {
            for (let i = 0; i < a.material.length; ++i) {
              traverse(
                  a.material[i], ((b as typeof a).material as Material[])[i]);
            }
          } else {
            traverse(a.material, (b as typeof a).material as Material);
          }
        }

        for (let i = 0; i < (a as Object3D).children.length; ++i) {
          traverse((a as Object3D).children[i], (b as Object3D).children[i]);
        }
      }
    };

    traverse(sceneOne, sceneTwo);
  }
}
