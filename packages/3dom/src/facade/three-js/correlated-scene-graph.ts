import {Material, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, Scene} from 'three';
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

/**
 * Maps the elements of a glTF to corresponding Three.js constructs. This helper
 * is async because the related Three.js constructs are cached behind promises.
 * In practice, the asynchrony should last no longer than a microtask.
 */
const mapThreeObjectsToGLTF = async (threeGLTF: ThreeGLTF, gltf: GLTF) => {
  const {cache} =
      (threeGLTF.parser as unknown as {cache: ThreeGLTFParserCache});
  const gltfElementMap: GLTFElementMap = new Map();
  const pendingObjectLookups: Promise<unknown>[] = [];

  const visitor = new GLTFTreeVisitor({
    material: (material, index) => {
      pendingObjectLookups.push(
          (cache.get(`material:${index}`) as Promise<MeshStandardMaterial>)
              .then((threeMaterial: MeshStandardMaterial) => {
                gltfElementMap.set(material, threeMaterial);
              }));
    }
  });

  visitor.visit(gltf);

  await Promise.all(pendingObjectLookups);

  return gltfElementMap;
};

export type GLTFElementMap = Map<GLTFElement, Object3D|Material>;

const $threeGLTF = Symbol('threeGLTF');
const $gltf = Symbol('gltf');
const $gltfElementMap = Symbol('gltfElementMap');

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
  private[$threeGLTF]: ThreeGLTF;
  private[$gltf]: GLTF;
  private[$gltfElementMap]: GLTFElementMap;

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
   * A Map of glTF element references to corresponding Three.js construct
   * references.
   */
  get gltfElementMap() {
    return this[$gltfElementMap];
  }

  constructor(
      threeGLTF: ThreeGLTF, gltf: GLTF, gltfElementMap: GLTFElementMap) {
    this[$threeGLTF] = threeGLTF;
    this[$gltf] = gltf;
    this[$gltfElementMap] = gltfElementMap;
  }
}

export const correlateSceneGraphs = async (threeGLTF: ThreeGLTF) => {
  const gltf: GLTF = JSON.parse(JSON.stringify(threeGLTF.parser.json)) as GLTF;
  const gltfElementMap = await mapThreeObjectsToGLTF(threeGLTF, gltf);
  return new CorrelatedSceneGraph(threeGLTF, gltf, gltfElementMap);
};
