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

import {FrontSide, Material, Mesh, MeshStandardMaterial, Object3D, Sphere, Texture} from 'three';
import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {$clone, $prepare, $preparedGLTF, GLTFInstance, PreparedGLTF} from '../GLTFInstance.js';
import {Renderer} from '../Renderer.js';

import {CorrelatedSceneGraph} from './correlated-scene-graph.js';



const $cloneAndPatchMaterial = Symbol('cloneAndPatchMaterial');
const $correlatedSceneGraph = Symbol('correlatedSceneGraph');

interface PreparedModelViewerGLTF extends PreparedGLTF {
  [$correlatedSceneGraph]?: CorrelatedSceneGraph;
}

/**
 * This specialization of GLTFInstance collects all of the processing needed
 * to prepare a model and to clone it making special considerations for
 * <model-viewer> use cases.
 */
export class ModelViewerGLTFInstance extends GLTFInstance {
  /**
   * @override
   */
  protected static[$prepare](source: GLTF) {
    const prepared = super[$prepare](source) as PreparedModelViewerGLTF;

    if (prepared[$correlatedSceneGraph] == null) {
      prepared[$correlatedSceneGraph] = CorrelatedSceneGraph.from(prepared);
    }

    const {scene} = prepared;

    const nullSphere = new Sphere(undefined, Infinity);

    scene.traverse((node: Object3D) => {
      // Set a high renderOrder while we're here to ensure the model
      // always renders on top of the skysphere
      node.renderOrder = 1000;

      // Three.js seems to cull some animated models incorrectly. Since we
      // expect to view our whole scene anyway, we turn off the frustum
      // culling optimization here.
      node.frustumCulled = false;
      // Animations for objects without names target their UUID instead. When
      // objects are cloned, they get new UUIDs which the animation can't
      // find. To fix this, we assign their UUID as their name.
      if (!node.name) {
        node.name = node.uuid;
      }
      const mesh = node as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        if ((mesh as any).isSkinnedMesh) {
          // Akin to disablig frustum culling above, we have to also manually
          // disable the bounds to make raycasting correct for skinned meshes.
          mesh.geometry.boundingSphere = nullSphere;
          // The bounding box is set in GLTFLoader by the accessor bounds, which
          // are not updated with animation.
          mesh.geometry.boundingBox = null;
        }
      }
    });

    return prepared;
  }

  get correlatedSceneGraph() {
    return (
        this[$preparedGLTF] as PreparedModelViewerGLTF)[$correlatedSceneGraph]!;
  }

  /**
   * @override
   */
  [$clone](): PreparedGLTF {
    const clone: PreparedModelViewerGLTF = super[$clone]();
    const sourceUUIDToClonedMaterial = new Map<string, Material>();

    clone.scene.traverse((node: Object3D) => {
      // Materials aren't cloned when cloning meshes; geometry
      // and materials are copied by reference. This is necessary
      // for the same model to be used twice with different
      // environment maps.
      if ((node as Mesh).isMesh) {
        const mesh = node as Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(
              (material) => this[$cloneAndPatchMaterial](
                  material as MeshStandardMaterial,
                  sourceUUIDToClonedMaterial));
        } else if (mesh.material != null) {
          mesh.material = this[$cloneAndPatchMaterial](
              mesh.material as MeshStandardMaterial,
              sourceUUIDToClonedMaterial);
        }
      }
    });

    // Cross-correlate the scene graph by relying on information in the
    // current scene graph; without this step, relationships between the
    // Three.js object graph and the glTF scene graph will be lost.
    clone[$correlatedSceneGraph] =
        CorrelatedSceneGraph.from(clone, this.correlatedSceneGraph);

    return clone;
  }

  /**
   * Creates a clone of the given material, and applies a patch to the
   * shader program.
   */
  [$cloneAndPatchMaterial](
      material: MeshStandardMaterial,
      sourceUUIDToClonedMaterial: Map<string, Material>) {
    // If we already cloned this material (determined by tracking the UUID of
    // source materials that have been cloned), then return that previously
    // cloned instance:
    if (sourceUUIDToClonedMaterial.has(material.uuid)) {
      return sourceUUIDToClonedMaterial.get(material.uuid)!;
    }

    const clone = material.clone() as MeshStandardMaterial;
    if (material.map != null) {
      clone.map = material.map.clone();
      clone.map.needsUpdate = true;
    }
    if (material.normalMap != null) {
      clone.normalMap = material.normalMap.clone();
      clone.normalMap.needsUpdate = true;
    }
    if (material.emissiveMap != null) {
      clone.emissiveMap = material.emissiveMap.clone();
      clone.emissiveMap.needsUpdate = true;
    }

    // Clones the roughnessMap if it exists.
    let roughnessMap: Texture|null = null;
    if (material.roughnessMap != null) {
      roughnessMap = material.roughnessMap.clone();
    }

    // Assigns the roughnessMap to the cloned material and generates mipmaps.
    if (roughnessMap != null) {
      roughnessMap.needsUpdate = true;
      clone.roughnessMap = roughnessMap;

      // Generates mipmaps from the clone of the roughnessMap.
      const {threeRenderer, roughnessMipmapper} = Renderer.singleton;
      // XR must be disabled while doing offscreen rendering or it will
      // clobber the camera.
      const {enabled} = threeRenderer.xr;
      threeRenderer.xr.enabled = false;
      const {image} = clone.roughnessMap;
      roughnessMipmapper.generateMipmaps(clone as MeshStandardMaterial);
      clone.roughnessMap.image = image;
      threeRenderer.xr.enabled = enabled;
    }

    // Checks if roughnessMap and metalnessMap share the same texture and
    // either clones or assigns.
    if (material.roughnessMap === material.metalnessMap) {
      clone.metalnessMap = roughnessMap;
    } else if (material.metalnessMap != null) {
      clone.metalnessMap = material.metalnessMap.clone();
      clone.metalnessMap.needsUpdate = true;
    }

    // Checks if roughnessMap and aoMap share the same texture and
    // either clones or assigns.
    if (material.roughnessMap === material.aoMap) {
      clone.aoMap = roughnessMap;
    } else if (material.aoMap != null) {
      clone.aoMap = material.aoMap.clone();
      clone.aoMap.needsUpdate = true;
    }

    // This makes shadows better for non-manifold meshes
    clone.shadowSide = FrontSide;

    sourceUUIDToClonedMaterial.set(material.uuid, clone);

    return clone;
  }
}
