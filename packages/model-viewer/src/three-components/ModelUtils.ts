/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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
import {FrontSide, Material, Object3D, Scene, Shader, Vector3} from 'three';
import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader';
import {SkeletonUtils} from 'three/examples/jsm/utils/SkeletonUtils.js';

import {cubeUVChunk} from './shader-chunk/cube_uv_reflection_fragment.glsl.js';
import {lightsChunk} from './shader-chunk/lights_physical_fragment.glsl.js';
import {shadowChunk} from './shader-chunk/shadowmap_pars_fragment.glsl.js';

// NOTE(cdata): What follows is a TypeScript-ified version of:
// https://gist.github.com/cdata/f2d7a6ccdec071839bc1954c32595e87

export interface FullGLTF extends GLTF {
  parser?: any;
}

/**
 * This is a patch to Three.js' handling of PMREM environments. This patch
 * has to be applied after cloning because Three.js does not seem to clone
 * the onBeforeCompile method.
 */
const updateShader = (shader: Shader) => {
  shader.fragmentShader =
      shader.fragmentShader
          .replace('#include <cube_uv_reflection_fragment>', cubeUVChunk)
          .replace('#include <lights_physical_fragment>', lightsChunk)
          .replace('#include <shadowmap_pars_fragment>', shadowChunk);
};

/**
 * Fully clones a parsed GLTF, including correct cloning of any SkinnedMesh
 * objects.
 *
 * NOTE(cdata): This is necessary due to limitations of the Three.js clone
 * routine on scenes. Without it, models with skeletal animations will not be
 * cloned properly.
 *
 * @see https://github.com/mrdoob/three.js/issues/5878
 */
export const cloneGltf = (gltf: FullGLTF): FullGLTF => {
  const clone:
      FullGLTF = {...gltf, scene: SkeletonUtils.clone(gltf.scene!) as Scene};

  const specularGlossiness =
      gltf.parser.extensions['KHR_materials_pbrSpecularGlossiness'];
  /**
   * Creates a clone of the given material, and applies a patch to the
   * shader program.
   */
  const cloneAndPatchMaterial = (material: Material): Material => {
    const clone = (material as any).isGLTFSpecularGlossinessMaterial ?
        specularGlossiness.cloneMaterial(material) :
        material.clone();
    clone.onBeforeCompile = updateShader;
    // This is a fix for NormalTangentMirrorTest. Remove when
    // https://github.com/mrdoob/three.js/issues/11438 is solved.
    if (!clone.vertexTangents && clone.normalScale) {
      clone.normalScale.y *= -1;
    }
    clone.shadowSide = FrontSide;
    if (clone.transparent) {
      clone.depthWrite = false;
    }
    return clone;
  };

  clone.scene!.traverse((node: any) => {
    // Set a high renderOrder while we're here to ensure the model
    // always renders on top of the skysphere
    node.renderOrder = 1000;

    if (specularGlossiness != null && node.isMesh) {
      node.onBeforeRender = specularGlossiness.refreshUniforms;
    }

    // Materials aren't cloned when cloning meshes; geometry
    // and materials are copied by reference. This is necessary
    // for the same model to be used twice with different
    // environment maps.
    if (Array.isArray(node.material)) {
      node.material = node.material.map(cloneAndPatchMaterial);
    } else if (node.material != null) {
      node.material = cloneAndPatchMaterial(node.material);
    }
  });

  return clone;
};

/**
 * Moves Three.js objects from one parent to another
 */
export const moveChildren = (from: Object3D, to: Object3D) => {
  while (from.children.length) {
    to.add(from.children.shift()!);
  }
};

/**
 * Performs a reduction across all the vertices of the input model and all its
 * children. The supplied function takes the reduced value and a vertex and
 * returns the newly reduced value. The value is initialized as zero.
 *
 * Adapted from Three.js, @see https://github.com/mrdoob/three.js/blob/7e0a78beb9317e580d7fa4da9b5b12be051c6feb/src/math/Box3.js#L241
 */
export const reduceVertices =
    (model: Object3D, func: (value: number, vertex: Vector3) => number):
        number => {
          let value = 0;
          const vector = new Vector3();
          model.traverse((object: any) => {
            let i, l;

            object.updateWorldMatrix(false, false);

            let geometry = object.geometry;

            if (geometry !== undefined) {
              if (geometry.isGeometry) {
                let vertices = geometry.vertices;

                for (i = 0, l = vertices.length; i < l; i++) {
                  vector.copy(vertices[i]);
                  vector.applyMatrix4(object.matrixWorld);

                  value = func(value, vector);
                }

              } else if (geometry.isBufferGeometry) {
                let attribute = geometry.attributes.position;

                if (attribute !== undefined) {
                  for (i = 0, l = attribute.count; i < l; i++) {
                    vector.fromBufferAttribute(attribute, i)
                        .applyMatrix4(object.matrixWorld);

                    value = func(value, vector);
                  }
                }
              }
            }
          });
          return value;
        };