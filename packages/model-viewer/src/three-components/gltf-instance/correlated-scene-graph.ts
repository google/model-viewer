import {Group, Material, Mesh, Object3D, Texture} from 'three';
import {GLTF as ThreeGLTF, GLTFReference, GLTFReferenceType} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {GLTF, GLTFElement} from '../../three-components/gltf-instance/gltf-2.0.js';



export type ThreeSceneObject = Object3D|Material|Texture;
type ThreeSceneObjectCallback = (a: ThreeSceneObject, b: ThreeSceneObject) =>
    void;

export type ThreeObjectSet = Set<ThreeSceneObject>;

export type GLTFElementToThreeObjectMap = Map<GLTFElement, ThreeObjectSet>;
export type ThreeObjectToGLTFElementHandleMap =
    Map<ThreeSceneObject, GLTFReference>;

const $threeGLTF = Symbol('threeGLTF');
const $gltf = Symbol('gltf');
const $gltfElementMap = Symbol('gltfElementMap');
const $threeObjectMap = Symbol('threeObjectMap');
const $parallelTraverseThreeScene = Symbol('parallelTraverseThreeScene');

const $correlateOriginalThreeGLTF = Symbol('correlateOriginalThreeGLTF');
const $correlateCloneThreeGLTF = Symbol('correlateCloneThreeGLTF');

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
   * Produce a CorrelatedSceneGraph from a naturally generated Three.js GLTF.
   * Such GLTFs are produced by Three.js' GLTFLoader, and contain cached
   * details that expedite the correlation step.
   *
   * If a CorrelatedSceneGraph is provided as the second argument, re-correlates
   * a cloned Three.js GLTF with a clone of the glTF hierarchy used to produce
   * the upstream Three.js GLTF that the clone was created from. The result
   * CorrelatedSceneGraph is representative of the cloned hierarchy.
   */
  static from(
      threeGLTF: ThreeGLTF,
      upstreamCorrelatedSceneGraph?: CorrelatedSceneGraph):
      CorrelatedSceneGraph {
    if (upstreamCorrelatedSceneGraph != null) {
      return this[$correlateCloneThreeGLTF](
          threeGLTF, upstreamCorrelatedSceneGraph);
    } else {
      return this[$correlateOriginalThreeGLTF](threeGLTF);
    }
  }

  private static[$correlateOriginalThreeGLTF](threeGLTF: ThreeGLTF):
      CorrelatedSceneGraph {
    const gltf = threeGLTF.parser.json as GLTF;

    const associations =
        threeGLTF.parser.associations as Map<ThreeSceneObject, GLTFReference>;
    const gltfElementMap: GLTFElementToThreeObjectMap = new Map();

    const defaultMaterial = {name: 'Default'} as Material;
    const defaultReference = {type: 'materials', index: -1};

    for (const threeMaterial of associations.keys()) {
      // Note: GLTFLoader creates a "default" material that has no
      // corresponding glTF element in the case that no materials are
      // specified in the source glTF. In this case we append a default
      // material to allow this to be operated upon.
      if (threeMaterial instanceof Material &&
          associations.get(threeMaterial) == null) {
        if (defaultReference.index < 0) {
          if (gltf.materials == null) {
            gltf.materials = [];
          }
          defaultReference.index = gltf.materials.length;
          gltf.materials.push(defaultMaterial);
        }

        threeMaterial.name = defaultMaterial.name;
        associations.set(threeMaterial, {materials: defaultReference.index});
      }
    }

    // Creates a reverse look up map (gltf-object to Three-object)
    for (const [threeObject, gltfMappings] of associations) {
      if (gltfMappings) {
        threeObject.userData = threeObject.userData || {};
        threeObject.userData.associations = gltfMappings;
      }

      for (const mapping in gltfMappings) {
        if (mapping != null && mapping !== 'primitives') {
          const type = mapping as GLTFReferenceType;
          const elementArray = gltf[type] || [];
          const gltfElement = elementArray[gltfMappings[type]!];
          if (gltfElement == null) {
            // TODO: Maybe throw here...
            continue;
          }

          let threeObjects = gltfElementMap.get(gltfElement);

          if (threeObjects == null) {
            threeObjects = new Set();
            gltfElementMap.set(gltfElement, threeObjects);
          }

          threeObjects.add(threeObject);
        }
      }
    }

    return new CorrelatedSceneGraph(
        threeGLTF, gltf, associations, gltfElementMap);
  }

  /**
   * Transfers the association between a raw glTF and a Three.js scene graph
   * to a clone of the Three.js scene graph, resolved as a new
   * CorrelatedSceneGraph instance.
   */
  private static[$correlateCloneThreeGLTF](
      cloneThreeGLTF: ThreeGLTF,
      upstreamCorrelatedSceneGraph: CorrelatedSceneGraph):
      CorrelatedSceneGraph {
    const originalThreeGLTF = upstreamCorrelatedSceneGraph.threeGLTF;
    const originalGLTF = upstreamCorrelatedSceneGraph.gltf;
    const cloneGLTF: GLTF = JSON.parse(JSON.stringify(originalGLTF));
    const cloneThreeObjectMap: ThreeObjectToGLTFElementHandleMap = new Map();
    const cloneGLTFElementMap: GLTFElementToThreeObjectMap = new Map();

    for (let i = 0; i < originalThreeGLTF.scenes.length; i++) {
      this[$parallelTraverseThreeScene](
          originalThreeGLTF.scenes[i],
          cloneThreeGLTF.scenes[i],
          (object: ThreeSceneObject, cloneObject: ThreeSceneObject) => {
            const elementReference =
                upstreamCorrelatedSceneGraph.threeObjectMap.get(object);

            if (elementReference == null) {
              return;
            }

            for (const mapping in elementReference) {
              if (mapping != null && mapping !== 'primitives') {
                const type = mapping as GLTFReferenceType;
                const index = elementReference[type]!;
                const cloneElement = cloneGLTF[type]![index];

                const mappings =
                    cloneThreeObjectMap.get(cloneObject) || {} as GLTFReference;
                mappings[type] = index;
                cloneThreeObjectMap.set(cloneObject, mappings);

                const cloneObjects: Set<typeof cloneObject> =
                    cloneGLTFElementMap.get(cloneElement) || new Set();
                cloneObjects.add(cloneObject);

                cloneGLTFElementMap.set(cloneElement, cloneObjects);
              }
            }
          });
    }

    return new CorrelatedSceneGraph(
        cloneThreeGLTF, cloneGLTF, cloneThreeObjectMap, cloneGLTFElementMap);
  }

  /**
   * Traverses two presumably identical Three.js scenes, and invokes a
   * callback for each Object3D or Material encountered, including the initial
   * scene. Adapted from
   * https://github.com/mrdoob/three.js/blob/7c1424c5819ab622a346dd630ee4e6431388021e/examples/jsm/utils/SkeletonUtils.js#L586-L596
   */
  private static[$parallelTraverseThreeScene](
      sceneOne: Group, sceneTwo: Group, callback: ThreeSceneObjectCallback) {
    const traverse = (a: Object3D, b: Object3D) => {
      callback(a, b);

      if (a.isObject3D) {
        const meshA = a as Mesh;
        const meshB = b as Mesh;
        if (meshA.material) {
          if (Array.isArray(meshA.material)) {
            for (let i = 0; i < meshA.material.length; ++i) {
              callback(meshA.material[i], (meshB.material as Material[])[i]);
            }
          } else {
            callback(meshA.material, meshB.material as Material);
          }
        }

        for (let i = 0; i < a.children.length; ++i) {
          traverse(a.children[i], b.children[i]);
        }
      }
    };

    traverse(sceneOne, sceneTwo);
  }

  private[$threeGLTF]: ThreeGLTF;
  private[$gltf]: GLTF;
  private[$gltfElementMap]: GLTFElementToThreeObjectMap;
  private[$threeObjectMap]: ThreeObjectToGLTFElementHandleMap;

  /**
   * The source Three.js GLTF result given to us by a Three.js GLTFLoader.
   */
  get threeGLTF(): ThreeGLTF {
    return this[$threeGLTF];
  }

  /**
   * The in-memory deserialized source glTF.
   */
  get gltf(): GLTF {
    return this[$gltf];
  }

  /**
   * A Map of glTF element references to arrays of corresponding Three.js
   * object references. Three.js objects are kept in arrays to account for
   * cases where more than one Three.js object corresponds to a single glTF
   * element.
   */
  get gltfElementMap(): GLTFElementToThreeObjectMap {
    return this[$gltfElementMap];
  }

  /**
   * A map of individual Three.js objects to corresponding elements in the
   * source glTF.
   */
  get threeObjectMap(): ThreeObjectToGLTFElementHandleMap {
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
}
