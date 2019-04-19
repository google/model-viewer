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

import {BackSide, BoxBufferGeometry, CubeCamera, EventDispatcher, HalfFloatType, LinearMipMapLinearFilter, LinearToneMapping, Mesh, MeshBasicMaterial, MeshStandardMaterial, PointLight, RGBAFormat, Scene, ShaderMaterial, Texture, WebGLRenderer, WebGLRenderTargetCube} from 'three';

const rendererTextureCache = new Map<WebGLRenderer, Texture>();

export default class EnvironmentMapGenerator extends EventDispatcher {
  protected scene: Scene = new Scene();
  protected camera: CubeCamera;

  protected blurScene: Scene;
  protected blurCamera: CubeCamera;
  protected blurMaterial: ShaderMaterial;

  protected blurRenderTarget1: WebGLRenderTargetCube;
  protected blurRenderTarget2: WebGLRenderTargetCube;

  protected createAreaLightMaterial(intensity: number): MeshBasicMaterial {
    const material = new MeshBasicMaterial();
    material.color.setScalar(intensity);
    return material;
  }

  constructor(protected renderer: WebGLRenderer) {
    super();

    // Scene

    const {scene} = this;
    scene.position.y = -3.5;

    const geometry = new BoxBufferGeometry();
    geometry.removeAttribute('uv');

    const roomMaterial =
        new MeshStandardMaterial({metalness: 0, side: BackSide});
    const boxMaterial = new MeshStandardMaterial({metalness: 0});

    const mainLight = new PointLight(0xffffff, 500.0, 28, 2);
    mainLight.position.set(0.418, 16.199, 0.300);
    scene.add(mainLight);

    const room = new Mesh(geometry, roomMaterial);
    room.position.set(-0.757, 13.219, 0.717);
    room.scale.set(31.713, 28.305, 28.591);
    scene.add(room);

    const box1 = new Mesh(geometry, boxMaterial);
    box1.position.set(-10.906, 2.009, 1.846);
    box1.rotation.set(0, -0.195, 0);
    box1.scale.set(2.328, 7.905, 4.651);
    scene.add(box1);

    const box2 = new Mesh(geometry, boxMaterial);
    box2.position.set(-5.607, -0.754, -0.758);
    box2.rotation.set(0, 0.994, 0);
    box2.scale.set(1.970, 1.534, 3.955);
    scene.add(box2);

    const box3 = new Mesh(geometry, boxMaterial);
    box3.position.set(6.167, 0.857, 7.803);
    box3.rotation.set(0, 0.561, 0);
    box3.scale.set(3.927, 6.285, 3.687);
    scene.add(box3);

    const box4 = new Mesh(geometry, boxMaterial);
    box4.position.set(-2.017, 0.018, 6.124);
    box4.rotation.set(0, 0.333, 0);
    box4.scale.set(2.002, 4.566, 2.064);
    scene.add(box4);

    const box5 = new Mesh(geometry, boxMaterial);
    box5.position.set(2.291, -0.756, -2.621);
    box5.rotation.set(0, -0.286, 0);
    box5.scale.set(1.546, 1.552, 1.496);
    scene.add(box5);

    const box6 = new Mesh(geometry, boxMaterial);
    box6.position.set(-2.193, -0.369, -5.547);
    box6.rotation.set(0, 0.516, 0);
    box6.scale.set(3.875, 3.487, 2.986);
    scene.add(box6);


    // -z right
    const light1 = new Mesh(geometry, this.createAreaLightMaterial(50));
    light1.position.set(-16.116, 14.37, 8.208);
    light1.scale.set(0.1, 2.428, 2.739);
    scene.add(light1);

    // -z left
    const light2 = new Mesh(geometry, this.createAreaLightMaterial(50));
    light2.position.set(-16.109, 18.021, -8.207);
    light2.scale.set(0.1, 2.425, 2.751);
    scene.add(light2);

    // +z
    const light3 = new Mesh(geometry, this.createAreaLightMaterial(17));
    light3.position.set(14.904, 12.198, -1.832);
    light3.scale.set(0.15, 4.265, 6.331);
    scene.add(light3);

    // +x
    const light4 = new Mesh(geometry, this.createAreaLightMaterial(43));
    light4.position.set(-0.462, 8.89, 14.520);
    light4.scale.set(4.38, 5.441, 0.088);
    scene.add(light4);

    // -x
    const light5 = new Mesh(geometry, this.createAreaLightMaterial(20));
    light5.position.set(3.235, 11.486, -12.541);
    light5.scale.set(2.5, 2.0, 0.1);
    scene.add(light5);

    this.camera = new CubeCamera(0.1, 100, 256);
    this.camera.renderTarget.texture.type = HalfFloatType;
    this.camera.renderTarget.texture.format = RGBAFormat;
    this.camera.renderTarget.texture.minFilter = LinearMipMapLinearFilter;
    this.camera.renderTarget.texture.generateMipmaps = true;

    // Blur

    this.blurScene = new Scene();

    this.blurMaterial = new ShaderMaterial({
      uniforms: {tCube: {value: null}},
      vertexShader: `
        varying vec3 vWorldDirection;
        #include <common>
        void main() {
          vWorldDirection = transformDirection( position, modelMatrix );
          #include <begin_vertex>
          #include <project_vertex>
          gl_Position.z = gl_Position.w;
        }
      `,
      fragmentShader: `
        uniform samplerCube tCube;
        varying vec3 vWorldDirection;
        void main() {
          vec4 texColor = textureCube( tCube, vec3( - vWorldDirection.x, vWorldDirection.yz ), 2.0 );
          gl_FragColor = mapTexelToLinear( texColor );
        }
      `,
      side: BackSide,
      depthTest: false,
      depthWrite: false
    });

    this.blurScene.add(new Mesh(geometry, this.blurMaterial));

    this.blurCamera = new CubeCamera(0.1, 100, 256);
    this.blurCamera.renderTarget.texture.type = HalfFloatType;
    this.blurCamera.renderTarget.texture.format = RGBAFormat;
    this.blurCamera.renderTarget.texture.minFilter = LinearMipMapLinearFilter;
    this.blurCamera.renderTarget.texture.generateMipmaps = true;

    //

    this.blurRenderTarget1 = this.camera.renderTarget;
    this.blurRenderTarget2 = this.blurCamera.renderTarget;
  }

  /**
   * Generate an environment map for a room.
   */
  generate(): Texture {
    if (!rendererTextureCache.has(this.renderer)) {
      (this.camera as any).clear(this.renderer);

      var gammaOutput = this.renderer.gammaOutput;
      var toneMapping = this.renderer.toneMapping;
      var toneMappingExposure = this.renderer.toneMappingExposure;

      this.renderer.toneMapping = LinearToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.gammaOutput = false;

      this.camera.update(this.renderer, this.scene);

      // Blur

      for (var i = 0; i < 16; i++) {
        // Ping-Pong
        if (i % 2 === 0) {
          this.blurMaterial.uniforms.tCube.value =
              this.blurRenderTarget1.texture;
          this.blurCamera.renderTarget = this.blurRenderTarget2;
        } else {
          this.blurMaterial.uniforms.tCube.value =
              this.blurRenderTarget2.texture;
          this.blurCamera.renderTarget = this.blurRenderTarget1;
        }
        this.blurCamera.update(this.renderer, this.blurScene);
      }

      this.renderer.toneMapping = toneMapping;
      this.renderer.toneMappingExposure = toneMappingExposure;
      this.renderer.gammaOutput = gammaOutput;

      rendererTextureCache.set(
          this.renderer, this.blurCamera.renderTarget.texture);
    }

    return rendererTextureCache.get(this.renderer)!;
  }

  dispose() {
    this.camera.renderTarget.dispose();
    this.blurRenderTarget1.dispose();
    this.blurRenderTarget2.dispose();
  }
}
