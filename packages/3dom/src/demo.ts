/* eslint-disable @typescript-eslint/no-explicit-any */
import {ACESFilmicToneMapping, Mesh, MeshStandardMaterial, PerspectiveCamera, PMREMGenerator, Scene, sRGBEncoding, UnsignedByteType, WebGLRenderer} from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTF, GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RGBELoader} from 'three/examples/jsm/loaders/RGBELoader.js';
import {RoughnessMipmapper} from 'three/examples/jsm/utils/RoughnessMipmapper.js';


import {ThreeDOMExecutionContext} from './context.js';
import {CorrelatedSceneGraph} from './facade/three-js/correlated-scene-graph.js';
import {ModelGraft} from './facade/three-js/model-graft.js';

class ThreeDOMDemo {
  container = document.querySelector('#container')!;
  camera = new PerspectiveCamera(
      45, window.innerWidth / window.innerHeight, 0.25, 20);
  scene = new Scene();
  renderer = new WebGLRenderer({antialias: true});

  pmremGenerator = new PMREMGenerator(this.renderer);

  controls = new OrbitControls(this.camera, this.renderer.domElement);

  textureLoader = new RGBELoader();
  gltfLoader = new GLTFLoader();

  constructor() {
    this.camera.position.set(-1.8, 0.6, 2.7);

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.renderer.outputEncoding = sRGBEncoding;

    this.container.appendChild(this.renderer.domElement);

    this.pmremGenerator.compileEquirectangularShader();

    this.controls.minDistance = 2;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 1, 0);
    this.controls.update();

    this.textureLoader.setDataType(UnsignedByteType)
        .setPath('../shared-assets/environments/')
        .load('lightroom_14b.hdr', (environmentTexture) => {
          const environmentMap =
              this.pmremGenerator.fromEquirectangular(environmentTexture)
                  .texture;

          this.scene.environment = environmentMap;

          environmentTexture.dispose();
          this.pmremGenerator.dispose();
        });

    this.gltfLoader.setPath('../shared-assets/models/');
    this.gltfLoader.load('Astronaut.glb', (gltf) => {
      const roughnessMipmapper = new RoughnessMipmapper(this.renderer);
      gltf.scene.traverse((child) => {
        if ((child as Mesh).isMesh && (child as Mesh).material &&
            ((child as Mesh).material as MeshStandardMaterial).isMaterial) {
          roughnessMipmapper.generateMipmaps(
              (child as Mesh).material as MeshStandardMaterial);
        }
      });
      roughnessMipmapper.dispose();

      this.scene.add(gltf.scene);

      this.activate3DOM(gltf);
    });

    window.addEventListener('resize', () => this.updateSize(), false);

    this.render();
  }

  updateSize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => {
      this.render();
    });
  }

  activate3DOM(gltf: GLTF) {
    const script = document.querySelector('script[type="3DOM"]')!;
    const scriptText = script.textContent!;

    const context =
        new ThreeDOMExecutionContext(['material-properties', 'messaging']);
    const graft = new ModelGraft(
        '../shared-assets/models/Astronaut.glb',
        CorrelatedSceneGraph.from(gltf));

    context.eval(scriptText);
    context.changeModel(graft);

    document.querySelector('#ui')!.addEventListener('click', (event) => {
      const colorString = (event.target as HTMLElement).dataset.color;

      if (!colorString) {
        return;
      }

      const color = colorString.split(',').map(
          (numberString) => parseFloat(numberString));

      // Forward interaction details to the <model-viewer> worklet:
      context.worker.postMessage({action: 'change-color', payload: color});
    });

    const dropZone =
        document.querySelector('#base-color .dropzone') as HTMLDivElement;
    const dropInputElement =
        document.querySelector('#base-color .input') as HTMLInputElement;
    const dropPreview =
        document.querySelector('#base-color .preview') as HTMLDivElement;


    const dropControl =
        new (self as any)
            .SimpleDropzone.SimpleDropzone(dropZone, dropInputElement);

    dropControl.on('drop', ({files}: any) => {
      let url = '';

      for (const file of (files as Map<string, File>).values()) {
        url = URL.createObjectURL(file);
        dropPreview.style.backgroundImage = `url(${url})`;
        break;
      }

      context.worker.postMessage({action: 'change-texture', payload: url});
    });
  }
}

(self as any).demo = new ThreeDOMDemo();
