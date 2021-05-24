import {Group, Material, Mesh, Object3D, Texture} from 'three';
import {GLTF as ThreeGLTF, GLTFReference} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {GLTF, GLTFElement, VariantMappings} from '../../three-components/gltf-instance/gltf-2.0.js';

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

    const {associations} = threeGLTF.parser;
    const gltfElementMap: GLTFElementToThreeObjectMap = new Map();

    const defaultMaterial = {name: 'Default'} as Material;
    const defaultReference = {type: 'materials', index: -1} as GLTFReference;

    // NOTE: IE11 does not have Map iterator methods
    associations.forEach((gltfElementReference, threeObject) => {
      // Note: GLTFLoader creates a "default" material that has no corresponding
      // glTF element in the case that no materials are specified in the source
      // glTF. In this case we append a default material to allow this to be
      // operated upon.
      if (gltfElementReference == null) {
        if (defaultReference.index < 0) {
          if (gltf.materials == null) {
            gltf.materials = [];
          }
          defaultReference.index = gltf.materials.length;
          gltf.materials.push(defaultMaterial);
        }
        gltfElementReference = defaultReference;
      }

      const {type, index} = gltfElementReference;
      const elementArray = gltf[type] || [];
      const gltfElement = elementArray[index];

      if (gltfElement == null) {
        // TODO: Maybe throw here...
        return;
      }

      let threeObjects = gltfElementMap.get(gltfElement);

      if (threeObjects == null) {
        threeObjects = new Set();
        gltfElementMap.set(gltfElement, threeObjects);
      }

      threeObjects.add(threeObject);
    });

    return new CorrelatedSceneGraph(
        threeGLTF, gltf, associations, gltfElementMap);
  }

  /**
   * Transfers the association between a raw glTF and a Three.js scene graph
   * to a clone of the Three.js scene graph, resolved as a new
   * CorrelatedsceneGraph instance.
   */
  private static[$correlateCloneThreeGLTF](
      cloneThreeGLTF: ThreeGLTF,
      upstreamCorrelatedSceneGraph: CorrelatedSceneGraph):
      CorrelatedSceneGraph {
    const originalThreeGLTF = upstreamCorrelatedSceneGraph.threeGLTF;
    const originalGLTF = upstreamCorrelatedSceneGraph.gltf;
    const cloneGLTF: GLTF = JSON.parse(JSON.stringify(originalGLTF));
    const cloneThreeObjectMap: ThreeObjectToGLTFElementHandleMap = new Map();
    const cloneGLTFELementMap: GLTFElementToThreeObjectMap = new Map();

    const defaultMaterial = {name: 'Default'} as Material;
    const defaultReference = {type: 'materials', index: -1} as GLTFReference;

    for (let i = 0; i < originalThreeGLTF.scenes.length; i++) {
      this[$parallelTraverseThreeScene](
          originalThreeGLTF.scenes[i],
          cloneThreeGLTF.scenes[i],
          (object: ThreeSceneObject, cloneObject: ThreeSceneObject) => {
            let elementReference =
                upstreamCorrelatedSceneGraph.threeObjectMap.get(object);

            if (elementReference == null) {
              if (defaultReference.index < 0) {
                if (cloneGLTF.materials == null) {
                  cloneGLTF.materials = [];
                }
                defaultReference.index = cloneGLTF.materials.length;
                cloneGLTF.materials.push(defaultMaterial);
              }
              elementReference = defaultReference;
            }

            const {type, index} = elementReference;
            const cloneElement = cloneGLTF[type]![index];

            cloneThreeObjectMap.set(cloneObject, {type, index});

            const cloneObjects: Set<typeof cloneObject> =
                cloneGLTFELementMap.get(cloneElement) || new Set();
            cloneObjects.add(cloneObject);

            cloneGLTFELementMap.set(cloneElement, cloneObjects);
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
  private static[$parallelTraverseThreeScene](
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

  loadVariant(variantIndex: number, onUpdate: () => void = () => {}):
      Set<number> {
    const updatedMaterials = new Set<number>();

    this.threeGLTF.scene.traverse(async (object) => {
      const {gltfExtensions} = object.userData;
      if (!(object as Mesh).isMesh || gltfExtensions == null) {
        return;
      }

      const meshVariantData = gltfExtensions['KHR_materials_variants'];
      if (meshVariantData == null) {
        return;
      }

      let materialIndex = -1;
      for (const mapping of (meshVariantData.mappings as VariantMappings)) {
        if (mapping.variants.indexOf(variantIndex) >= 0) {
          materialIndex = mapping.material;
          break;
        }
      }
      if (materialIndex < 0) {
        return;
      }

      const material =
          await this.threeGLTF.parser.getDependency('material', materialIndex);
      updatedMaterials.add(materialIndex);
      (object as Mesh).material = material;
      this.threeGLTF.parser.assignFinalMaterial(object as Mesh);
      onUpdate();

      const gltfElement = this.gltf.materials![materialIndex];
      let threeObjects = this.gltfElementMap.get(gltfElement);

      if (threeObjects == null) {
        threeObjects = new Set();
        this.gltfElementMap.set(gltfElement, threeObjects);
      }

      threeObjects.add((object as Mesh).material as Material);
    });

    return updatedMaterials;
  }
}
