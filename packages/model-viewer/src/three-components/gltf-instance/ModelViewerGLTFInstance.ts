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

import {BackSide, DoubleSide, FrontSide, Material, Mesh, MeshStandardMaterial, Object3D, Shader} from 'three';
import {GLTF} from 'three/examples/jsm/loaders/GLTFLoader.js';

import {$clone, $prepare, $preparedGLTF, GLTFInstance, PreparedGLTF} from '../GLTFInstance.js';
import {Renderer} from '../Renderer.js';
import {alphaChunk} from '../shader-chunk/alphatest_fragment.glsl.js';

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

    const meshesToDuplicate: Mesh[] = [];

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
      if (!(node as Mesh).isMesh) {
        return;
      }
      node.castShadow = true;
      const mesh = node as Mesh;
      let transparent = false;
      const materials =
          Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => {
        if ((material as any).isMeshStandardMaterial) {
          if (material.transparent && material.side === DoubleSide) {
            transparent = true;
            material.side = FrontSide;
          }
          Renderer.singleton.roughnessMipmapper.generateMipmaps(
              material as MeshStandardMaterial);
        }
      });

      if (transparent) {
        meshesToDuplicate.push(mesh);
      }
    });

    // We duplicate transparent, double-sided meshes and render the back face
    // before the front face. This creates perfect triangle sorting for all
    // convex meshes. Sorting artifacts can still appear when you can see
    // through more than two layers of a given mesh, but this can usually be
    // mitigated by the author splitting the mesh into mostly convex regions.
    // The performance cost is not too great as the same shader is reused and
    // the same number of fragments are processed; only the vertex shader is run
    // twice. @see https://threejs.org/examples/webgl_materials_physical_transparency.html
    for (const mesh of meshesToDuplicate) {
      const materials =
          Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const duplicateMaterials = materials.map((material) => {
        const backMaterial = material.clone();
        backMaterial.side = BackSide;
        return backMaterial;
      });
      const duplicateMaterial = Array.isArray(mesh.material) ?
          duplicateMaterials :
          duplicateMaterials[0];
      const meshBack = new Mesh(mesh.geometry, duplicateMaterial);
      meshBack.renderOrder = -1;
      mesh.add(meshBack);
    }

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

    clone.scene.traverse((node: any) => {
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

    // Clone the textures manually since material cloning is shallow. The
    // underlying images are still shared.
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

    if ((material as any).isGLTFSpecularGlossinessMaterial) {
      if ((material as any).specularMap != null) {
        (clone as any).specularMap = (material as any).specularMap?.clone();
        (clone as any).specularMap.needsUpdate = true;
      }
      if ((material as any).glossinessMap != null) {
        (clone as any).glossinessMap = (material as any).glossinessMap?.clone();
        (clone as any).glossinessMap.needsUpdate = true;
      }
    } else {
      // ao, roughness and metalness sometimes share a texture.
      if (material.metalnessMap === material.aoMap) {
        clone.metalnessMap = clone.aoMap;
      } else if (material.metalnessMap != null) {
        clone.metalnessMap = material.metalnessMap.clone();
        clone.metalnessMap.needsUpdate = true;
      }

      if (material.roughnessMap === material.aoMap) {
        clone.roughnessMap = clone.aoMap;
      } else if (material.roughnessMap === material.metalnessMap) {
        clone.roughnessMap = clone.metalnessMap;
      } else if (material.roughnessMap != null) {
        clone.roughnessMap = material.roughnessMap.clone();
        clone.roughnessMap.needsUpdate = true;
      }
    }

    // This allows us to patch three's materials, on top of patches already
    // made, for instance GLTFLoader patches SpecularGlossiness materials.
    // Unfortunately, three's program cache differentiates SpecGloss materials
    // via onBeforeCompile.toString(), so these two functions do the same
    // thing but look different in order to force a proper recompile.
    const oldOnBeforeCompile = material.onBeforeCompile;
    clone.onBeforeCompile = (material as any).isGLTFSpecularGlossinessMaterial ?
        (shader: Shader) => {
          oldOnBeforeCompile(shader, undefined as any);
          shader.fragmentShader = shader.fragmentShader.replace(
              '#include <alphatest_fragment>', alphaChunk);
        } :
        (shader: Shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
              '#include <alphatest_fragment>', alphaChunk);
          oldOnBeforeCompile(shader, undefined as any);
        };
    // This makes shadows better for non-manifold meshes
    clone.shadowSide = FrontSide;
    // This improves transparent rendering and can be removed whenever
    // https://github.com/mrdoob/three.js/pull/18235 finally lands.
    if (clone.transparent) {
      clone.depthWrite = false;
    }
    // This little hack ignores alpha for opaque materials, in order to comply
    // with the glTF spec.
    if (!clone.alphaTest && !clone.transparent) {
      clone.alphaTest = -0.5;
    }

    sourceUUIDToClonedMaterial.set(material.uuid, clone);

    return clone;
  }
}