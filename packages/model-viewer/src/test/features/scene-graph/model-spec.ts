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

import {Texture} from 'three';
import {MeshStandardMaterial} from 'three/src/materials/MeshStandardMaterial.js';
import {Mesh} from 'three/src/objects/Mesh.js';

import {$lazyLoadGLTFInfo} from '../../../features/scene-graph/material.js';
import {$hierarchy, $materials, $switchVariant, Model} from '../../../features/scene-graph/model.js';
import {$primitives, $threeNode} from '../../../features/scene-graph/nodes/primitive-node.js';
import {$correlatedObjects} from '../../../features/scene-graph/three-dom-element.js';
import {CorrelatedSceneGraph, ThreeSceneObject} from '../../../three-components/gltf-instance/correlated-scene-graph.js';
import {GLTF, Node} from '../../../three-components/gltf-instance/gltf-2.0.js';
import {assetPath, loadThreeGLTF} from '../../helpers.js';



const expect = chai.expect;

const ASTRONAUT_GLB_PATH = assetPath('models/Astronaut.glb');
const KHRONOS_TRIANGLE_GLB_PATH =
    assetPath('models/glTF-Sample-Models/2.0/Triangle/glTF/Triangle.gltf');
const CUBES_GLTF_PATH = assetPath('models/cubes.gltf');
const TWOCYLENGINE_GLB_PATH = assetPath(
    'models/glTF-Sample-Models/2.0/2CylinderEngine/glTF-Binary/2CylinderEngine.glb');
const RIGGEDFIGURE_GLB_PATH = assetPath(
    'models/glTF-Sample-Models/2.0/RiggedFigure/glTF-Binary/RiggedFigure.glb');
const BRAINSTEM_GLB_PATH = assetPath(
    'models/glTF-Sample-Models/2.0/BrainStem/glTF-Binary/BrainStem.glb');
suite('scene-graph/model', () => {
  suite('Model', () => {
    test('creates a "default" material, when none is specified', async () => {
      const threeGLTF = await loadThreeGLTF(KHRONOS_TRIANGLE_GLB_PATH);
      const model = new Model(0, CorrelatedSceneGraph.from(threeGLTF));

      expect(model.materials.length).to.be.eq(1);
      expect(model.materials[0].name).to.be.eq('Default');
    });

    test.skip('exposes a list of materials in the scene', async () => {
      // TODO: This test is skipped because [$correlatedObjects] can contain
      // unused materials, because it can contain a base material and the
      // derived material (from assignFinalMaterial(), if for instance
      // vertexTangents are used) even if only the derived material is assigned
      // to a mesh. These extras make the test fail. We may want to remove these
      // unused materials from [$correlatedObjects] at which point this test
      // will pass, but it's not hurting anything.
      const threeGLTF = await loadThreeGLTF(ASTRONAUT_GLB_PATH);
      const materials: Set<MeshStandardMaterial> = new Set();

      threeGLTF.scene.traverse((object) => {
        if ((object as Mesh).isMesh) {
          const material = (object as Mesh).material;
          if (Array.isArray(material)) {
            material.forEach(
                (material) => materials.add(material as MeshStandardMaterial));
          } else {
            materials.add(material as MeshStandardMaterial);
          }
        }
      });

      const model = new Model(0, CorrelatedSceneGraph.from(threeGLTF));

      const collectedMaterials = new Set<MeshStandardMaterial>();

      model.materials.forEach((material) => {
        for (const threeMaterial of material[$correlatedObjects] as
             Set<MeshStandardMaterial>) {
          collectedMaterials.add(threeMaterial);
          expect(materials.has(threeMaterial)).to.be.true;
        }
      });

      expect(collectedMaterials.size).to.be.equal(materials.size);
    });

    suite('Model Variants', () => {
      test('Switch variant and lazy load', async () => {
        const threeGLTF = await loadThreeGLTF(CUBES_GLTF_PATH);
        const model = new Model(0, CorrelatedSceneGraph.from(threeGLTF));
        expect(model[$materials][2][$correlatedObjects]).to.be.null;
        expect(model[$materials][2][$lazyLoadGLTFInfo]).to.be.ok;

        await model[$switchVariant]('Yellow Red');

        expect(model[$materials][2][$correlatedObjects]).to.not.be.null;
        expect(model[$materials][2][$lazyLoadGLTFInfo]).to.not.be.ok;
      });

      test(
          'Switch back to default variant does not change correlations',
          async () => {
            const threeGLTF = await loadThreeGLTF(CUBES_GLTF_PATH);
            const model = new Model(0, CorrelatedSceneGraph.from(threeGLTF));

            const sizeBeforeSwitch =
                model[$materials][0][$correlatedObjects]!.size;

            await model[$switchVariant]('Yellow Yellow');
            // Switches back to default.
            await model[$switchVariant]('Purple Yellow');

            expect(model[$materials][0][$correlatedObjects]!.size)
                .equals(sizeBeforeSwitch);
          });

      test(
          'Switching variant when model has no variants has not effect',
          async () => {
            const threeGLTF = await loadThreeGLTF(KHRONOS_TRIANGLE_GLB_PATH);
            const model = new Model(0, CorrelatedSceneGraph.from(threeGLTF));

            const threeMaterial =
                model[$materials][0][$correlatedObjects]!.values().next().value;
            const sizeBeforeSwitch =
                model[$materials][0][$correlatedObjects]!.size;
            await model[$switchVariant]('Does not exist');

            expect(
                model[$materials][0][$correlatedObjects]!.values().next().value)
                .equals(threeMaterial);
            expect(model[$materials][0][$correlatedObjects]!.size)
                .equals(sizeBeforeSwitch);
          });

      suite('Model Hierarchy', () => {
        test(
            'Nodes are never associated twice (with multi-primitive model)',
            async () => {
              const threeGLTF = await loadThreeGLTF(TWOCYLENGINE_GLB_PATH);
              const gltf = threeGLTF.parser.json as GLTF;
              const correlatedSceneGraph = CorrelatedSceneGraph.from(threeGLTF);

              // Prints the hierarchy.
              // const traverse = (node: Object3D, depth: number) => {
              //   let indent = '';
              //   for (let i = 0; i < depth; ++i) {
              //     indent += ' ';
              //   }
              //   const assoc = threeGLTF.parser.associations.get(node) as
              //       GLTFReferenceWithPrimitive;
              //   console.log(
              //       indent + 'Node: ' + node.name +
              //       ` nodes: ${assoc?.nodes}, meshes${assoc?.meshes} prim: ${
              //           assoc?.primitives}`);
              //   if (node.children.length > 0) {
              //     indent += '|';
              //   }
              //   console.log(indent);
              //   for (const child of node.children) {
              //     traverse(child, depth + 1);
              //   }
              // };

              // traverse(threeGLTF.scene, 0);

              for (const [_i, node] of gltf.nodes!.entries()) {
                const mappings = correlatedSceneGraph.gltfElementMap.get(node)!;
                expect(mappings.size).to.be.equal(1);
              }
            });

        test(
            'Nodes are never associated twice (with skinned model)',
            async () => {
              const threeGLTF = await loadThreeGLTF(RIGGEDFIGURE_GLB_PATH);
              const gltf = threeGLTF.parser.json as GLTF;
              const correlatedSceneGraph = CorrelatedSceneGraph.from(threeGLTF);

              for (const [_i, node] of gltf.nodes!.entries()) {
                const mappings = correlatedSceneGraph.gltfElementMap.get(node)!;
                expect(mappings.size).to.be.equal(1);
              }
            });

        test(
            'Nodes are never associated twice (with animated model)',
            async () => {
              const threeGLTF = await loadThreeGLTF(BRAINSTEM_GLB_PATH);
              const gltf = threeGLTF.parser.json as GLTF;
              const correlatedSceneGraph = CorrelatedSceneGraph.from(threeGLTF);

              for (const [_i, node] of gltf.nodes!.entries()) {
                const mappings = correlatedSceneGraph.gltfElementMap.get(node)!;
                expect(mappings.size).to.be.equal(1);
              }
            });

        test('Expanded MVNode hierarchy matches glTF hierarchy', async () => {
          const threeGLTF = await loadThreeGLTF(TWOCYLENGINE_GLB_PATH);
          const gltf = threeGLTF.parser.json as GLTF;
          const correlatedSceneGraph = CorrelatedSceneGraph.from(threeGLTF);
          const model = new Model(0, correlatedSceneGraph);

          // Builds a flat hierarchy of glTF node indices.
          const stack = new Array<number>();
          const hierarchy = new Array<number>();
          for (const node of gltf.scenes![0].nodes) {
            stack.push(node);
          }
          while (stack.length > 0) {
            const nodeIdx = stack.pop()!;
            hierarchy.push(nodeIdx);

            const node: Node = gltf.nodes![nodeIdx];
            if (node.children) {
              for (const c of node.children) {
                stack.push(c);
              }
            }
          }

          // Tests glTF hierarchy against MVNode hierarchy
          expect(hierarchy.length).to.equal(model[$hierarchy].length);

          for (const [i, mvNode] of model[$hierarchy].entries()) {
            expect(hierarchy[i]).to.equal(mvNode.nodesIndex);
          }
        });

        test(
            'MVNode mesh components match glTF node mesh components',
            async () => {
              const threeGLTF = await loadThreeGLTF(TWOCYLENGINE_GLB_PATH);
              const gltf = threeGLTF.parser.json as GLTF;
              const correlatedSceneGraph = CorrelatedSceneGraph.from(threeGLTF);
              const model = new Model(0, correlatedSceneGraph);

              // Builds a flat hierarchy of glTF node indices.
              const stack = new Array<number>();
              const hierarchy = new Array<number>();
              for (const node of gltf.scenes![0].nodes) {
                stack.push(node);
              }
              while (stack.length > 0) {
                const nodeIdx = stack.pop()!;
                hierarchy.push(nodeIdx);

                const node: Node = gltf.nodes![nodeIdx];
                if (node.children) {
                  for (const c of node.children) {
                    stack.push(c);
                  }
                }
              }

              for (let i = 0; i < model[$hierarchy].length; ++i) {
                const node = gltf.nodes![hierarchy[i]];

                let primitiveCount = undefined;
                if (node.mesh != null) {
                  const mesh = gltf.meshes![node.mesh];
                  primitiveCount = mesh.primitives.length;
                }

                // Easily printable data structures to compare.
                const gltfInfo = {
                  node: hierarchy[i],
                  mesh: node.mesh,
                  primitiveCount: primitiveCount
                };
                const mvInfo = {
                  node: model[$hierarchy][i].nodesIndex,
                  mesh: model[$hierarchy][i].mesh?.meshesIndex,
                  primitiveCount:
                      model[$hierarchy][i].mesh?.[$primitives].length
                };

                expect(gltfInfo.node).to.equal(mvInfo.node);
                expect(gltfInfo.mesh).to.equal(mvInfo.mesh);
                expect(gltfInfo.primitiveCount).to.equal(mvInfo.primitiveCount);
              }
            });


        test(
            'All Three nodes and meshes accounted for in the MVNode hierarchy',
            async () => {
              const threeGLTF = await loadThreeGLTF(TWOCYLENGINE_GLB_PATH);
              const gltf = threeGLTF.parser.json as GLTF;
              const correlatedSceneGraph = CorrelatedSceneGraph.from(threeGLTF);
              const model = new Model(0, correlatedSceneGraph);

              // Builds a flat hierarchy of glTF node indices.
              const stack = new Array<number>();
              const hierarchy = new Array<number>();
              for (const node of gltf.scenes![0].nodes) {
                stack.push(node);
              }
              while (stack.length > 0) {
                const nodeIdx = stack.pop()!;
                hierarchy.push(nodeIdx);

                const node: Node = gltf.nodes![nodeIdx];
                if (node.children) {
                  for (const c of node.children) {
                    stack.push(c);
                  }
                }
              }

              // The goal here is to walk the MVNode hierarchy and remove each
              // three object mapping from the gltfElementMap, if there are
              // objects remaining than the Three hierarchy is not fully
              // represented by the MVNode hierarchy. Conversely, if by walking
              // the MV hierarchy we can fully remove everything from the
              // gltElementMap than the hierarchy should be accurate.

              // Removes all texture and material mappings.
              for (const [_, value] of correlatedSceneGraph.gltfElementMap) {
                for (const item of value) {
                  if ((item as MeshStandardMaterial).isMeshStandardMaterial ||
                      (item as Texture).isTexture) {
                    value.delete(item);
                  }
                }
              }

              // Helper method looks up a set in the map and removes the
              // threeObject.
              const deleteFromMappedSet =
                  (gltfObject: Node|Mesh, threeObject: ThreeSceneObject) => {
                    correlatedSceneGraph.gltfElementMap.get(gltfObject)
                        ?.delete(threeObject);
                  }

              // Walks over each MVNode and deletes its wrapped Three object
              // from the gltfElementMap
              for (let i = 0; i < model[$hierarchy].length; ++i) {
                const mvNode = model[$hierarchy][i];
                const node = gltf.nodes![mvNode.nodesIndex];
                correlatedSceneGraph.gltfElementMap.delete(node);
                deleteFromMappedSet(node, mvNode[$threeNode]!);
                if (mvNode.mesh) {
                  // Walks each primitive and removes them from the
                  // gltfElementMap.
                  for (const primitive of mvNode.mesh[$primitives]) {
                    const gltfReference =
                        correlatedSceneGraph.threeObjectMap.get(
                            primitive.threeMesh);
                    // Removes the mesh and node mapping, in Three.js a mesh can
                    // be a node sometimes.
                    const node = gltf.nodes![gltfReference?.nodes!];
                    const mesh = gltf.meshes![gltfReference?.meshes!];
                    deleteFromMappedSet(node, primitive.threeMesh);
                    deleteFromMappedSet(mesh, primitive.threeMesh);
                  }
                }
              }

              // Clears out empty sets.
              for (const [key, value] of correlatedSceneGraph.gltfElementMap) {
                if (value.size == 0) {
                  correlatedSceneGraph.gltfElementMap.delete(key);
                }
              }

              // The gltfElementMap should be cleared of all sets.
              expect(correlatedSceneGraph.gltfElementMap.size).to.equal(0);
            });
      });
    });
  });
});
