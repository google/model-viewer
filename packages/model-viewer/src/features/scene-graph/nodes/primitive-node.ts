
import {Material as ThreeMaterial, Mesh, SkinnedMesh} from 'three';
import {GLTFReference} from 'three/examples/jsm/loaders/GLTFLoader';

import {CorrelatedSceneGraph} from '../../../three-components/gltf-instance/correlated-scene-graph.js';
import {KHRMaterialsVariants, Node as GLTFNode, Primitive} from '../../../three-components/gltf-instance/gltf-2.0.js';
import {$getLoadedMaterial, Material} from '../material.js';

import {Node} from './node.js';



export const $materials = Symbol('materials');
const $variantInfo = Symbol('variantInfo');
const $mesh = Symbol('mesh');
export const $primitives = Symbol('primitives');
export const $loadVariant = Symbol('loadVariant');
export const $correlatedSceneGraph = Symbol('correlatedSceneGraph');
export const $prepareVariantsForExport = Symbol('prepareVariantsForExport');
export const $switchVariant = Symbol('switchVariant');

// Represents a primitive in a glTF mesh.
export class PrimitiveNode extends Node {
  private[$mesh]: Mesh;
  // Maps glTF material index number to a material that this primitive supports.
  private[$materials] = new Map<number, Material>();
  // Maps variant name to material index.
  private[$variantInfo]: Map<string, {material: Material, index: number}>;
  // List of child nodes.
  constructor(
      mesh: Mesh, mvMaterials: Material[],
      correlatedSceneGraph: CorrelatedSceneGraph) {
    super(mesh.name);
    this[$mesh] = mesh;
    const {gltf, threeGLTF} = correlatedSceneGraph;

    // TODO: Remove the associationKey 'work arounds' after fixing Three.js
    // associations. This is needed for now because Three.js does not create
    // associations with SkinnedMeshes (glTF primitives of an animated object)
    // and incorrect associations are formed when a mesh has multiple
    // primitives.
    let gltfMeshReference =
        correlatedSceneGraph.threeObjectMap.get(mesh) as GLTFReference;
    // Work around 1, skinned meshes (glTF primitives) have no association but
    // the parent (mesh) does, which maps to a 'node'.
    if (mesh instanceof SkinnedMesh && mesh.parent != null) {
      gltfMeshReference =
          correlatedSceneGraph.threeObjectMap.get(mesh.parent) as GLTFReference;
    } else if (gltfMeshReference.type === 'materials' && mesh.parent != null) {
      // Work around 2, when a static model has multiple primitives the
      // association value is a material not a node.
      gltfMeshReference =
          correlatedSceneGraph.threeObjectMap.get(mesh.parent) as GLTFReference;
    }

    const {type: nodes, index: nodeIndex} = gltfMeshReference;

    // Should have the correct reference type now.
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
      if (primitive.material != null) {
        this[$materials].set(
            primitive.material, mvMaterials[primitive.material]);
      } else {
        const defaultIdx = mvMaterials.findIndex((mat: Material) => {
          return mat.name === 'Default';
        });
        if (defaultIdx >= 0) {
          this[$materials].set(defaultIdx, mvMaterials[defaultIdx]);
        } else {
          console.warn('Primitive has no material!');
        }
      }

      if (primitive.extensions &&
          primitive.extensions['KHR_materials_variants']) {
        const variantsExtension =
            primitive.extensions['KHR_materials_variants'] as
            KHRMaterialsVariants;
        const extensions = threeGLTF.parser.json.extensions;
        const variantNames = extensions['KHR_materials_variants'].variants;
        // Provides definition now that we know there are variants to
        // support.
        this[$variantInfo] =
            new Map<string, {material: Material, index: number}>();
        for (const mapping of variantsExtension.mappings) {
          // Maps variant indices to Materials.
          this[$materials].set(mapping.material, mvMaterials[mapping.material]);
          for (const variant of mapping.variants) {
            const {name} = variantNames[variant];
            this[$variantInfo].set(name, {
              material: mvMaterials[mapping.material],
              index: mapping.material
            });
          }
        }
      }
    }
  }

  get mesh() {
    return this[$mesh];
  }

  async setActiveMaterial(material: number):
      Promise<ThreeMaterial|ThreeMaterial[]|null> {
    const mvMaterial = this[$materials].get(material);
    if (mvMaterial != null) {
      this.mesh.material = await mvMaterial[$getLoadedMaterial]();
    }
    return this.mesh.material;
  }

  async enableVariant(name: string):
      Promise<ThreeMaterial|ThreeMaterial[]|null> {
    if (this[$variantInfo] != null) {
      const material = this[$variantInfo].get(name);
      if (material != null) {
        // tslint:disable-next-line:no-return-await needed by FireFox
        return await this.setActiveMaterial(material.index);
      }
    }
    return null;
  }

  async instantiateVariants() {
    if (this[$variantInfo] == null) {
      return;
    }
    for (const name of this[$variantInfo].keys()) {
      if (this.mesh.userData.variantMaterials.get(name).material != null) {
        continue;
      }
      const threeMaterial = await this.enableVariant(name);
      if (threeMaterial != null) {
        this.mesh.userData.variantMaterials.get(name).material = threeMaterial;
      }
    }
  }

  get variantInfo() {
    return this[$variantInfo];
  }
}
