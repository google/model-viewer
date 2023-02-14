/* @license
 * Copyright 2020 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License atQ
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {PathTracingRenderer, PathTracingSceneGenerator, PhysicalPathTracingMaterial} from 'three-gpu-pathtracer';
import {WebGLRenderer, MeshBasicMaterial, PerspectiveCamera, ACESFilmicToneMapping, sRGBEncoding, CustomBlending, MathUtils, Sphere, Box3, Object3D, Mesh, BufferAttribute, Group, DirectionalLight} from 'three';
import {FullScreenQuad} from 'three/examples/jsm/postprocessing/Pass';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import * as MikkTSpace from 'three/examples/jsm/libs/mikktspace.module';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';

import {ScenarioConfig} from '../../common.js';

const $initialize = Symbol('initialize');
const $updateScenario = Symbol('updateScenario');
const $updateSize = Symbol('updateSize');
const $canvas = Symbol('canvas');
const $renderer = Symbol('renderer');
const $pathtracer = Symbol('path tracer');
const $fsquad = Symbol('fullscreen quad');
const $camera = Symbol('camera');
const $controls = Symbol('controls');

@customElement('three-gpu-pathtracer-viewer')
export class ThreePathTracerViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;
  private[$canvas]: HTMLCanvasElement|null = null;
  private[$renderer]!: WebGLRenderer;
  private[$pathtracer]: any;
  private[$fsquad]!: FullScreenQuad;
  private[$camera]!: PerspectiveCamera;
  private[$controls]!: OrbitControls;

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    this[$updateSize]();

    if (changedProperties.has('scenario') && this.scenario != null) {
      this[$updateScenario](this.scenario);
    }
  }

  static get styles() {
    return css`
:host {
 display: block;
}
`;
  }

  render() {
    return html`<canvas id="canvas"></canvas>`;
  }

  private[$initialize]() {
    this[$canvas] = this.shadowRoot!.querySelector('canvas');
    this[$fsquad] = new FullScreenQuad(new MeshBasicMaterial({map: null, blending: CustomBlending}));
    this[$camera] = new PerspectiveCamera(50, 1, 0.01, 2000);

    this[$renderer] = new WebGLRenderer({canvas: this[$canvas] || undefined});
    this[$renderer].toneMapping = ACESFilmicToneMapping;
    this[$renderer].outputEncoding = sRGBEncoding;

    this[$pathtracer] = new PathTracingRenderer(this[$renderer]);
    this[$pathtracer].material = new PhysicalPathTracingMaterial();
    this[$pathtracer].camera = this[$camera];
    this[$pathtracer].alpha = true;

    this[$controls] = new OrbitControls(this[$camera], this[$renderer].domElement);
    this[$controls].addEventListener('change', () => this[$pathtracer].reset());
  }


  private async[$updateScenario](scenario: ScenarioConfig) {
    // call initialize here instead of inside constructor because in lit
    // element's life cycle, canvas element is added to dom after the
    // constructor is called.
    if (this[$renderer] == null) {
      this[$initialize]();
    }

    const {
      orbit,
      target,
      verticalFoV,
      renderSkybox,
      lighting,
      model,
    } = scenario;

    const camera = this[$camera];
    const renderer = this[$renderer];
    const pathtracer = this[$pathtracer];
    const ptMaterial = pathtracer.material;
    const controls = this[$controls];

    pathtracer.tiles.set(2, 2);
    renderer.setClearColor(0xffffff, 0);
    renderer.setAnimationLoop(null);
    renderer.clear();

    // load assets
    const hdr = await new RGBELoader().loadAsync(lighting);
    const gltf = await new GLTFLoader().loadAsync(model);

    // remove directional light parents to replicate issue with light targets
    // after cloning a gltf model
    // see mrdoob/three#17370
    gltf.scene.traverse((child) => {
      if (child instanceof DirectionalLight) {
        child.target.removeFromParent();
      }
    });

    gltf.scene.updateMatrixWorld(true);

    // generate tangents if they're not present
    await MikkTSpace.ready;
    gltf.scene.traverse((c:Object3D) => {
      if (c instanceof Mesh) {
        if (!c.geometry.hasAttribute('normal')) {
          c.geometry.computeVertexNormals();
        }

        if (!c.geometry.attributes.tangent) {
          if (c.geometry.hasAttribute('uv')) {
            BufferGeometryUtils.computeMikkTSpaceTangents(c.geometry, MikkTSpace);
          } else {
            c.geometry.setAttribute(
              'tangent',
              new BufferAttribute(new Float32Array(c.geometry.attributes.position.count * 4), 4, false),
            );
          }
        }
      }
    });

    // scale the scene to avoid floating point issues
    const box = new Box3();
    box.setFromObject(gltf.scene);

    const sphere = new Sphere();
    box.getBoundingSphere(sphere);

    // update camera
    const radius = Math.max(orbit.radius, sphere.radius, 1e-5);
    camera.near = 2 * radius / 1000;
    camera.far = 2 * radius;
    camera.updateProjectionMatrix();

    camera.position.setFromSphericalCoords(orbit.radius, MathUtils.DEG2RAD * orbit.phi, MathUtils.DEG2RAD * orbit.theta);
    camera.fov = verticalFoV;
    camera.updateProjectionMatrix();
    controls.update();

    const targetGroup = new Group();
    targetGroup.position.set(-target.x, -target.y, -target.z);
    targetGroup.add(gltf.scene);
    targetGroup.updateMatrixWorld(true);

    // process assets
    const generator = new PathTracingSceneGenerator();
    const {bvh, textures, materials, lights} = generator.generate(targetGroup);
    const geometry = bvh.geometry;

    // update bvh and geometry info
    ptMaterial.bvh.updateFrom(bvh);
    ptMaterial.attributesArray.updateFrom(
      geometry.attributes.normal,
      geometry.attributes.tangent,
      geometry.attributes.uv,
      geometry.attributes.color,
    );
    ptMaterial.filterGlossyFactor = 0.5;
    ptMaterial.bounces = 8;
    ptMaterial.backgroundAlpha = renderSkybox ? 1 : 0;

    // update material and texture info
    ptMaterial.materialIndexAttribute.updateFrom(bvh.geometry.attributes.materialIndex);
    ptMaterial.textures.setTextures(renderer, 2048, 2048, textures);
    ptMaterial.materials.updateFrom(materials, textures);
    ptMaterial.lights.updateFrom(lights);

    // update envmap
    ptMaterial.envMapInfo.updateFrom(hdr);

    this[$updateSize]();

    const MAX_SAMPLES = 100;
    let eventBroadcast = false;
    renderer.setAnimationLoop(() => {
      const camera = this[$camera];
      const pathtracer = this[$pathtracer];
      const renderer = this[$renderer];
      const fsquad = this[$fsquad];
      camera.updateMatrixWorld();

      if (pathtracer.samples < MAX_SAMPLES) {
        pathtracer.update();
      }

      renderer.autoClear = false;
      (fsquad.material as MeshBasicMaterial).map = pathtracer.target.texture;
      fsquad.render(renderer);
      renderer.autoClear = false;

      if (!eventBroadcast && pathtracer.samples >= MAX_SAMPLES) {
        const ev = new CustomEvent('model-visibility', {detail: {visible: true}});
        this.dispatchEvent(ev);
        eventBroadcast = true;
      }
    });
  }

  private[$updateSize]() {
    if (this[$canvas] == null || this.scenario == null) {
      return;
    }

    const renderer = this[$renderer];
    const camera = this[$camera];
    const pathtracer = this[$pathtracer];
    const {dimensions} = this.scenario;

    const dpr = window.devicePixelRatio;
    const {width, height} = dimensions;

    renderer.setSize(width, height);
    renderer.setPixelRatio(dpr);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    pathtracer.setSize(width * dpr, height * dpr);

    pathtracer.reset();
  }
}
