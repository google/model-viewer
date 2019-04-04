/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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
import {Bone, Camera, Material, Scene, Skeleton, SkinnedMesh} from 'three';

// NOTE(cdata): What follows is a TypeScript-ified version of:
// https://gist.github.com/cdata/f2d7a6ccdec071839bc1954c32595e87

export interface Gltf {
  animations: Array<any>;
  scene: Scene|null;
  scenes: Array<Scene>;
  cameras: Array<Camera>;
  asset: any;
  parser: any;
  userData: any;
}

type SkinnedMeshMap = {
  [index: string]: SkinnedMesh
};

type BoneMap = {
  [index: string]: Bone
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
export const cloneGltf = (gltf: Gltf): Gltf => {
  const hasScene = gltf.scene != null;
  const clone:
      Gltf = {...gltf, scene: hasScene ? gltf.scene!.clone(true) : null};

  const skinnedMeshes: SkinnedMeshMap = {};
  let hasSkinnedMeshes = false;

  if (hasScene) {
    gltf.scene!.traverse((node: any) => {
      // Set a high renderOrder while we're here to ensure the model
      // always renders on top of the skysphere
      node.renderOrder = 1000;

      // Materials aren't cloned when cloning meshes; geometry
      // and materials are copied by reference. This is necessary
      // for the same model to be used twice with different
      // environment maps.
      if (Array.isArray(node.material)) {
        node.material =
            node.material.map((material: Material) => material.clone());
      } else if (node.material != null) {
        node.material = node.material.clone();
      }

      if (node.isSkinnedMesh) {
        hasSkinnedMeshes = true;
        skinnedMeshes[node.name] = node as SkinnedMesh;
      }
    });
  }

  const cloneBones: BoneMap = {};
  const cloneSkinnedMeshes: SkinnedMeshMap = {};

  if (hasScene && hasSkinnedMeshes) {
    clone.scene!.traverse((node: any) => {
      if (node.isBone) {
        cloneBones[node.name] = node as Bone;
      }

      if (node.isSkinnedMesh) {
        cloneSkinnedMeshes[node.name] = node as SkinnedMesh;
      }
    });
  }

  for (let name in skinnedMeshes) {
    const skinnedMesh = skinnedMeshes[name];
    const skeleton = skinnedMesh.skeleton;
    const cloneSkinnedMesh = cloneSkinnedMeshes[name];

    const orderedCloneBones: Array<Bone> = [];

    for (let i = 0; i < skeleton.bones.length; ++i) {
      const cloneBone = cloneBones[skeleton.bones[i].name];
      orderedCloneBones.push(cloneBone);
    }

    cloneSkinnedMesh.bind(
        new Skeleton(orderedCloneBones, skeleton.boneInverses),
        cloneSkinnedMesh.matrixWorld);
  }

  return clone;
};
