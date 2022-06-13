
import {css, customElement, html, LitElement, property} from 'lit-element';
import {ScenarioConfig} from '../../common.js';
// @ts-ignore
import Rn from '../../../node_modules/rhodonite/dist/esm/index.mjs';

const $isRhodoniteInitDone = Symbol('isRhodoniteInitDone');
const $updateSize = Symbol('updateSize');
const $updateScenario = Symbol('updateScenario');
const $canvas = Symbol('canvas');

@customElement('rhodonite-viewer')
export class RhodoniteViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;
  private[$canvas]: HTMLCanvasElement|null;
  private[$isRhodoniteInitDone] = false;

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

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    this[$updateSize]();

    if (changedProperties.has('scenario') && this.scenario != null) {
      this[$updateScenario](this.scenario);
    }
  }

  private async[$updateScenario](scenario: ScenarioConfig) {
    // Rhodonite Initialization
    await this.initRhodonite();

    const iblRotation = + 180;

    // Update Size
    this[$updateSize]();

    // create Frame and Expressions
    const frame = new Rn.Frame();
    
    // create FrameBuffers
    const { framebufferTargetOfGammaMsaa, framebufferTargetOfGammaResolve, framebufferTargetOfGammaResolveForReference } = createRenderTargets(scenario.dimensions.width, scenario.dimensions.height);
    
    // Load glTF Expression
    const { cameraComponent, cameraEntity, mainRenderPass, modelTransparentExpression } = await loadGltf(frame, scenario, framebufferTargetOfGammaMsaa, framebufferTargetOfGammaResolve, framebufferTargetOfGammaResolveForReference);
    
    // setup IBL
    const prefilterObj = await setupIBL(scenario, iblRotation);
    
    if (Rn.Is.exist(prefilterObj)) {
      setupBackgroundEnvCubeExpression(frame, prefilterObj, framebufferTargetOfGammaMsaa, mainRenderPass, scenario, iblRotation);
    }
    
    // MSAA Resolve Expression
    setupMsaaResolveExpression(frame, framebufferTargetOfGammaMsaa, framebufferTargetOfGammaResolve, framebufferTargetOfGammaResolveForReference);

    frame.addExpression(modelTransparentExpression);
    
    // Post GammaCorrection Expression
    setupGammaExpression(frame, framebufferTargetOfGammaResolve);

    // setup camera
    setupCamera(mainRenderPass, scenario, cameraEntity, cameraComponent);

    // Draw
    this.draw(frame);
  }

  private async initRhodonite() {
    if (this[$isRhodoniteInitDone] === false) {
      this[$canvas] = this.shadowRoot!.querySelector('canvas');
      await Rn.System.init({
        approach: Rn.ProcessApproach.UniformWebGL2,
        canvas: this[$canvas] as HTMLCanvasElement,
      });
      this[$isRhodoniteInitDone] === true;
    }
    Rn.MeshRendererComponent.isDepthMaskTrueForTransparencies = true;
  }

  private draw(frame: Rn.Frame) {
    requestAnimationFrame(() => {
      function draw() {
        Rn.System.process(frame);
        requestAnimationFrame(draw);
      }
      draw();
      this.dispatchEvent(
        // This notifies the framework that the model is visible and the
        // screenshot can be taken
        new CustomEvent('model-visibility', { detail: { visible: true } }));
    });
  }

  private[$updateSize]() {
    if (this[$canvas] == null || this.scenario == null) {
      return;
    }

    const canvas = this[$canvas]!;
    const {dimensions} = this.scenario;

    const dpr = window.devicePixelRatio;
    const width = dimensions.width * dpr;
    const height = dimensions.height * dpr;

    Rn.System.resizeCanvas(width, height);

    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
  }
}

async function setupIBL(scenario: ScenarioConfig, rotation: number) {
  const split = scenario.lighting.split('.');
  const ext = split[split.length - 1];
  if (ext === 'hdr') {
    const prefilterObj = await prefilterFromUri(scenario.lighting);
    setupPrefilteredIBLTexture(prefilterObj, rotation);
    return prefilterObj;
  }
  return undefined;
}

function setupCamera(mainRenderPass: any, scenario: ScenarioConfig, cameraEntity: any, cameraComponent: any) {
  const sceneTopLevelGraphComponents = mainRenderPass.sceneTopLevelGraphComponents as Rn.SceneGraphComponent[];
  const rootGroup = sceneTopLevelGraphComponents![0].entity as Rn.ISceneGraphEntity;
  const aabb = rootGroup.getSceneGraph().calcWorldAABB();

  Rn.MeshRendererComponent.isViewFrustumCullingEnabled = false;
  const { target, orbit } = scenario!;

  const center = [target.x, target.y, target.z];

  const theta = (orbit.theta) * Math.PI / 180;
  const phi = (orbit.phi) * Math.PI / 180;
  const radiusSinPhi = orbit.radius * Math.sin(phi);
  const eye = [
    radiusSinPhi * Math.sin(theta) + target.x,
    orbit.radius * Math.cos(phi) + target.y,
    radiusSinPhi * Math.cos(theta) + target.z
  ];
  if (orbit.radius <= 0) {
    center[0] = eye[0] - Math.sin(phi) * Math.sin(theta);
    center[1] = eye[1] - Math.cos(phi);
    center[2] = eye[2] - Math.sin(phi) * Math.cos(theta);
  }
  const up = [0, 1, 0];

  cameraEntity.getCamera().eyeInner = Rn.Vector3.fromCopyArray3(eye);
  cameraEntity.getCamera().up = Rn.Vector3.fromCopyArray3(up);
  cameraEntity.getCamera().directionInner = Rn.Vector3.fromCopyArray3(center);
  cameraEntity.getCamera().primitiveMode = true;

  const modelRadius = aabb.lengthCenterToCorner;
  // const max = aabb.maxPoint;
  // const min = aabb.minPoint;
  // const modelRadius = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
  const far = 6 * Math.max(modelRadius, orbit.radius);
  const near = far / 100;
  cameraComponent.zNearInner = near;
  cameraComponent.zFarInner = far;
}

async function loadGltf(frame: Rn.Frame, scenario: ScenarioConfig, framebufferTargetOfGammaMsaa: Rn.FrameBuffer, framebufferTargetOfGammaResolve: Rn.FrameBuffer, framebufferTargetOfGammaResolveForReference: Rn.FrameBuffer) {
  const initialExpression = setupInitialExpression(framebufferTargetOfGammaMsaa);
  frame.addExpression(initialExpression);

  // camera
  const cameraEntity = Rn.EntityHelper.createCameraEntity();
  const cameraComponent = cameraEntity.getCamera();
  cameraComponent.fovyInner = scenario.verticalFoV;
  cameraComponent.aspectInner = scenario.dimensions.width / scenario.dimensions.height;

  // gltf
  const modelOpaqueExpression = await Rn.GltfImporter.import(
    scenario.model,
    {
      cameraComponent: cameraComponent,
      defaultMaterialHelperArgumentArray: [
        {
          makeOutputSrgb: false,
        },
      ],
    }
  );
  const modelOpaquePass = modelOpaqueExpression.renderPasses[0];
  modelOpaquePass.tryToSetUniqueName('modelOpaque', true);
  modelOpaquePass.cameraComponent = cameraComponent;
  Rn.CameraComponent.current = cameraComponent.componentSID;

  modelOpaquePass.setFramebuffer(framebufferTargetOfGammaMsaa);
  modelOpaquePass.toClearColorBuffer = false;
  modelOpaquePass.toClearDepthBuffer = false;
  modelOpaquePass.toRenderOpaquePrimitives = true;
  modelOpaquePass.toRenderTransparentPrimitives = false;

  // Transparent
  const modelTransparentExpression = modelOpaqueExpression.clone();
  modelTransparentExpression.tryToSetUniqueName('modelTransparent', true);
  const renderPassMainTranslucent = modelTransparentExpression.renderPasses[0];
  renderPassMainTranslucent.toRenderOpaquePrimitives = false;
  renderPassMainTranslucent.toRenderTransparentPrimitives = true;
  renderPassMainTranslucent.toClearDepthBuffer = false;
  renderPassMainTranslucent.setFramebuffer(framebufferTargetOfGammaMsaa);
  renderPassMainTranslucent.setResolveFramebuffer(framebufferTargetOfGammaResolve);
  for (const entity of renderPassMainTranslucent.entities) {
    const meshComponent = entity.tryToGetMesh();
    if (Rn.Is.exist(meshComponent)) {
      const mesh = meshComponent.mesh;
      if (Rn.Is.exist(mesh)) {
        for (const primitive of mesh.primitives) {
          primitive.material.setTextureParameter(
            Rn.ShaderSemantics.BackBufferTexture, framebufferTargetOfGammaResolveForReference.getColorAttachedRenderTargetTexture(0));
        }
      }
    }
  }

  frame.addExpression(modelOpaqueExpression);
  
  return { cameraComponent, cameraEntity, mainRenderPass: modelOpaquePass, modelTransparentExpression };
}

function setupGammaExpression(frame: Rn.Frame, gammaTargetFramebuffer: Rn.FrameBuffer) {
  const expressionGammaEffect = new Rn.Expression();

  // gamma correction (and super sampling)
  const postEffectCameraEntity = createPostEffectCameraEntity();
  const postEffectCameraComponent = postEffectCameraEntity.getCamera();

  const gammaCorrectionMaterial = Rn.MaterialHelper.createGammaCorrectionMaterial();
  // gammaCorrectionMaterial.setParameter(Rn.ShaderSemantics.EnableLinearToSrgb, Rn.Scalar.fromCopyNumber(0));
  const gammaCorrectionRenderPass = createPostEffectRenderPass(
    gammaCorrectionMaterial,
    postEffectCameraComponent
  );

  setTextureParameterForMeshComponents(
    gammaCorrectionRenderPass.meshComponents!,
    Rn.ShaderSemantics.BaseColorTexture,
    gammaTargetFramebuffer.getColorAttachedRenderTargetTexture(0)
  );
  
  expressionGammaEffect.addRenderPasses([gammaCorrectionRenderPass]);

  frame.addExpression(expressionGammaEffect);
}

function setupInitialExpression(framebufferTargetOfGammaMsaa: Rn.FrameBuffer) {
  const expression = new Rn.Expression();
  expression.tryToSetUniqueName('Initial', true);
  const initialRenderPass = new Rn.RenderPass();
  initialRenderPass.clearColor = Rn.Vector4.fromCopyArray4([0.0, 0.0, 0.0, 0.0]);
  initialRenderPass.toClearColorBuffer = false;
  initialRenderPass.toClearDepthBuffer = true;
  const initialRenderPassForFrameBuffer = new Rn.RenderPass();
  initialRenderPassForFrameBuffer.clearColor = Rn.Vector4.fromCopyArray4([0.0, 0.0, 0.0, 0.0]);
  initialRenderPassForFrameBuffer.toClearColorBuffer = true;
  initialRenderPassForFrameBuffer.toClearDepthBuffer = true;
  initialRenderPassForFrameBuffer.setFramebuffer(framebufferTargetOfGammaMsaa)
  expression.addRenderPasses([initialRenderPass, initialRenderPassForFrameBuffer]);
  return expression;
}

function setupMsaaResolveExpression(frame: Rn.Frame, framebufferTargetOfGammaMsaa: Rn.FrameBuffer, framebufferTargetOfGammaResolve: Rn.FrameBuffer, framebufferTargetOfGammaResolveForReference: Rn.FrameBuffer) {
  const expressionForResolve = new Rn.Expression()
  expressionForResolve.tryToSetUniqueName('Resolve', true)
  const renderPassForResolve = new Rn.RenderPass()
  expressionForResolve.addRenderPasses([renderPassForResolve])

  renderPassForResolve.toClearDepthBuffer = false
  renderPassForResolve.setFramebuffer(framebufferTargetOfGammaMsaa)
  renderPassForResolve.setResolveFramebuffer(framebufferTargetOfGammaResolve)
  renderPassForResolve.setResolveFramebuffer2(framebufferTargetOfGammaResolveForReference)
  // getRnAppModel().setResolveExpression(expressionForResolve.objectUID)

  frame.addExpression(expressionForResolve);

  return expressionForResolve;
}

function createRenderTargets(canvasWidth: number, canvasHeight: number) {
  // MSAA depth
  const framebufferTargetOfGammaMsaa = Rn.RenderableHelper.createTexturesForRenderTarget(canvasWidth, canvasHeight, 0, {
    isMSAA: true,
    sampleCountMSAA: 4,
  });
  framebufferTargetOfGammaMsaa.tryToSetUniqueName('FramebufferTargetOfGammaMsaa', true);

  // Resolve Color 1
  const framebufferTargetOfGammaResolve = Rn.RenderableHelper.createTexturesForRenderTarget(canvasWidth, canvasHeight, 1, {
    createDepthBuffer: true,
  });
  framebufferTargetOfGammaResolve.tryToSetUniqueName('FramebufferTargetOfGammaResolve', true);

  // Resolve Color 2
  const framebufferTargetOfGammaResolveForReference = Rn.RenderableHelper.createTexturesForRenderTarget(canvasWidth, canvasHeight, 1, {
    createDepthBuffer: false,
    minFilter: Rn.TextureParameter.LinearMipmapLinear
  });
  framebufferTargetOfGammaResolveForReference.tryToSetUniqueName('FramebufferTargetOfGammaResolveForReference', true);
  return { framebufferTargetOfGammaMsaa, framebufferTargetOfGammaResolve, framebufferTargetOfGammaResolveForReference };
}

function createPostEffectRenderPass(
  material: Rn.Material,
  cameraComponent: Rn.CameraComponent
) {
  const boardPrimitive = new Rn.Plane();
  boardPrimitive.generate({
    width: 1,
    height: 1,
    uSpan: 1,
    vSpan: 1,
    isUVRepeat: false,
    material,
  });

  const boardMesh = new Rn.Mesh();
  boardMesh.addPrimitive(boardPrimitive);

  const boardEntity = Rn.EntityHelper.createMeshEntity();
  boardEntity.getTransform().rotate = Rn.Vector3.fromCopyArray([
    Math.PI / 2,
    0.0,
    0.0,
  ]);
  boardEntity.getTransform().translate = Rn.Vector3.fromCopyArray([
    0.0, 0.0, -0.5,
  ]);
  const boardMeshComponent = boardEntity.getMesh();
  boardMeshComponent.setMesh(boardMesh);

  const renderPass = new Rn.RenderPass();
  renderPass.toClearColorBuffer = false;
  renderPass.cameraComponent = cameraComponent;
  renderPass.addEntities([boardEntity]);

  return renderPass;
}


function createPostEffectCameraEntity() {
  const cameraEntity = Rn.EntityHelper.createCameraEntity();
  const cameraComponent = cameraEntity.getCamera();
  cameraComponent.zNearInner = 0.5;
  cameraComponent.zFarInner = 2.0;
  return cameraEntity;
}

function setTextureParameterForMeshComponents(
  meshComponents: Rn.MeshComponent[],
  shaderSemantic: Rn.ShaderSemanticsEnum,
  value: any
) {
  for (let i = 0; i < meshComponents.length; i++) {
    const mesh = meshComponents[i].mesh;
    if (!mesh) continue;

    const primitiveNumber = mesh.getPrimitiveNumber();
    for (let j = 0; j < primitiveNumber; j++) {
      const primitive = mesh.getPrimitiveAt(j);
      primitive.material.setTextureParameter(shaderSemantic, value);
    }
  }
}
declare const wasm_bindgen: any;
let initPrefilteringWasmPromise: Promise<unknown>;
let glPrefiltering: WebGLRenderingContext;

function initPrefilteringWasm() {
  return new Promise(resolve => {
    if (initPrefilteringWasmPromise != null) {
      // already initialized
      initPrefilteringWasmPromise.then(() => {
        resolve();
      });
    }

    const uri = 'https://storage.googleapis.com/emadurandal-3d-public.appspot.com/rhodonite/vendor/ibl_prefiltering_wasm_bg.wasm'

    initPrefilteringWasmPromise = wasm_bindgen(uri).then(() => {
      const canvas = document.createElement('canvas') as HTMLCanvasElement
      glPrefiltering = canvas.getContext('webgl') as WebGLRenderingContext
      const {init_webgl_extensions} = wasm_bindgen
      init_webgl_extensions(glPrefiltering)

      resolve();
    }) as Promise<void>

  }) as Promise<void>;
}

async function prefilterFromUri(hdrFileUri: string) {
  await initPrefilteringWasm()

  const {request_binary, CubeMapPrefilter} = wasm_bindgen

  const cubeMapSize = 512
  const irradianceCubeMapSize = 32
  const pmremCubeMapSize = 128
  const pmremCubeMapMipCount = 8
  const brdfLutSize = 512
  const sample_count = 1024;
  const prefilter = new CubeMapPrefilter(glPrefiltering, cubeMapSize, irradianceCubeMapSize, pmremCubeMapSize, pmremCubeMapMipCount, brdfLutSize, sample_count)

  const hdrImageData = await request_binary(hdrFileUri)
  prefilter.load_hdr_image(glPrefiltering, hdrImageData)
  prefilter.process(glPrefiltering)

  return prefilter
}

function setupPrefilteredIBLTexture(prefilter: any, rotation: number) {
  const specularCubeTexture = new Rn.CubeTexture()
  const specularTextureTypedArrayImages = getSpecularCubeTextureTypedArrays(prefilter)
  specularCubeTexture.mipmapLevelNumber = specularTextureTypedArrayImages.length
  const specularTextureSize = getSpecularCubeTextureSize(prefilter, 0)
  specularCubeTexture.generateTextureFromTypedArrays(
    specularTextureTypedArrayImages,
    specularTextureSize,
    specularTextureSize
  )
  specularCubeTexture.hdriFormat = Rn.HdriFormat.RGBE_PNG

  const diffuseCubeTexture = new Rn.CubeTexture()
  const diffuseTextureTypedArrayImages = getDiffuseCubeTextureTypedArrays(prefilter)
  const diffuseTextureSize = getDiffuseCubeTextureSize(prefilter)
  diffuseCubeTexture.generateTextureFromTypedArrays(
    diffuseTextureTypedArrayImages,
    diffuseTextureSize,
    diffuseTextureSize
  )
  diffuseCubeTexture.hdriFormat = Rn.HdriFormat.RGBE_PNG;

  attachIBLTextureToAllMeshComponents(diffuseCubeTexture, specularCubeTexture, rotation);

  return [diffuseCubeTexture, specularCubeTexture];
}

function getSpecularCubeTextureTypedArrays(prefilter: any) {
  const specularTextureTypedArrays = [];
  const mipCount = prefilter.pmrem_cubemap_mip_count();

  for (let mipLevel = 0; mipLevel < mipCount; mipLevel++) {
    specularTextureTypedArrays.push(
      {
        posX: prefilter.pmrem_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_POSITIVE_X, mipLevel),
        negX: prefilter.pmrem_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_NEGATIVE_X, mipLevel),
        posY: prefilter.pmrem_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_POSITIVE_Y, mipLevel),
        negY: prefilter.pmrem_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_NEGATIVE_Y, mipLevel),
        posZ: prefilter.pmrem_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_POSITIVE_Z, mipLevel),
        negZ: prefilter.pmrem_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_NEGATIVE_Z, mipLevel)
      }
    );
  }

  return specularTextureTypedArrays;
}

function getDiffuseCubeTextureTypedArrays(prefilter: any) {
  return [
    {
      posX: prefilter.irradiance_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_POSITIVE_X),
      negX: prefilter.irradiance_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_NEGATIVE_X),
      posY: prefilter.irradiance_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_POSITIVE_Y),
      negY: prefilter.irradiance_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_NEGATIVE_Y),
      posZ: prefilter.irradiance_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_POSITIVE_Z),
      negZ: prefilter.irradiance_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_NEGATIVE_Z)
    }
  ]
}

export function getEnvCubeTextureSize(prefilter: any) {
  return prefilter.hdr_cubemap_texture_size()
}

export function getDiffuseCubeTextureSize(prefilter: any) {
  return prefilter.irradiance_cubemap_texture_size()
}

export function getSpecularCubeTextureSize(prefilter: any, mipLevel: number) {
  return prefilter.pmrem_cubemap_texture_size(mipLevel)
}

function attachIBLTextureToAllMeshComponents(diffuseCubeTexture: Rn.CubeTexture, specularCubeTexture: Rn.CubeTexture, rotation: number) {
  const meshRendererComponents = Rn.ComponentRepository.getComponentsWithType(Rn.MeshRendererComponent) as Rn.MeshRendererComponent[]
  for (let i = 0; i < meshRendererComponents.length; i++) {
    const meshRendererComponent = meshRendererComponents[i];
    meshRendererComponent.specularCubeMap = specularCubeTexture;
    meshRendererComponent.diffuseCubeMap = diffuseCubeTexture;
    meshRendererComponent.diffuseCubeMapContribution = 0.5;
    meshRendererComponent.specularCubeMapContribution = 0.5;
    meshRendererComponent.rotationOfCubeMap = Rn.MathUtil.degreeToRadian(rotation)
  }
  const meshComponents = Rn.ComponentRepository.getComponentsWithType(Rn.MeshComponent) as Rn.MeshComponent[]
  for (let i = 0; i < meshComponents.length; i++) {
    const meshComponent = meshComponents[i];
    const mesh = meshComponent.mesh;
    if (Rn.Is.exist(mesh)) {
      for (let i=0; i<mesh.getPrimitiveNumber(); i++) {
        const primitive = mesh.getPrimitiveAt(i);
        primitive.material.setParameter(Rn.ShaderSemantics.InverseEnvironment, Rn.Scalar.fromCopyNumber(0));
      }
    }

  }

}

function getEnvCubeTextureTypedArrays(prefilter: any) {
  return [
    {
      posX: prefilter.hdr_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_POSITIVE_X),
      negX: prefilter.hdr_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_NEGATIVE_X),
      posY: prefilter.hdr_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_POSITIVE_Y),
      negY: prefilter.hdr_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_NEGATIVE_Y),
      posZ: prefilter.hdr_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_POSITIVE_Z),
      negZ: prefilter.hdr_cubemap_texture_to_arrybuffer(glPrefiltering, glPrefiltering.TEXTURE_CUBE_MAP_NEGATIVE_Z)
    }
  ]
}

function setPrefilteredEnvCubeTexture(cubeTexture: Rn.CubeTexture, sphereMaterial: Rn.Material, prefilter: unknown) {
  const envCubeTextureTypedArrayImages = getEnvCubeTextureTypedArrays(prefilter)
  const envCubeTextureSize = getEnvCubeTextureSize(prefilter)

  cubeTexture.generateTextureFromTypedArrays(
    envCubeTextureTypedArrayImages,
    envCubeTextureSize,
    envCubeTextureSize
  )
  cubeTexture.hdriFormat = Rn.HdriFormat.RGBE_PNG
  sphereMaterial.setParameter(Rn.ShaderSemantics.EnvHdriFormat, Rn.HdriFormat.RGBE_PNG.index)
}

function setupBackgroundEnvCubeExpression(frame: Rn.Frame, prefilter: any, framebufferTargetOfGammaMsaa: Rn.FrameBuffer, mainRenderPass: Rn.RenderPass, scenario: ScenarioConfig, rotation: number) {
  // create sphere
  const sphereEntity = Rn.EntityHelper.createMeshEntity()
  sphereEntity.tryToSetUniqueName('Sphere Env Cube', true)
  sphereEntity.tryToSetTag({
    tag: 'type',
    value: 'background-assets',
  })
  const spherePrimitive = new Rn.Sphere()
  const sphereMaterial = Rn.MaterialHelper.createEnvConstantMaterial();
  sphereMaterial.setParameter(Rn.ShaderSemantics.MakeOutputSrgb, 0);
  sphereMaterial.setParameter(Rn.ShaderSemantics.envRotation, Rn.MathUtil.degreeToRadian(rotation));
  sphereMaterial.setParameter(Rn.ShaderSemantics.InverseEnvironment, Rn.Scalar.fromCopyNumber(0));

  // environment Cube Texture
  const environmentCubeTexture = new Rn.CubeTexture()
  setPrefilteredEnvCubeTexture(environmentCubeTexture, sphereMaterial, prefilter)
  sphereMaterial.setTextureParameter(Rn.ShaderSemantics.ColorEnvTexture, environmentCubeTexture)

  // setup sphere
  const sceneTopLevelGraphComponents = mainRenderPass.sceneTopLevelGraphComponents as Rn.SceneGraphComponent[];
  const rootGroup = sceneTopLevelGraphComponents![0].entity as Rn.ISceneGraphEntity;
  const aabb = rootGroup.getSceneGraph().calcWorldAABB();
  spherePrimitive.generate({ radius: aabb.lengthCenterToCorner*6.0 , widthSegments: 40, heightSegments: 40, material: sphereMaterial })
  const sphereMeshComponent = sphereEntity.getComponent(Rn.MeshComponent) as Rn.MeshComponent
  const sphereMesh = new Rn.Mesh()
  sphereMesh.addPrimitive(spherePrimitive)
  sphereMeshComponent.setMesh(sphereMesh)
  sphereEntity.translate = Rn.Vector3.fromCopy3(scenario.target.x, scenario.target.y, scenario.target.z);
  sphereEntity.scale = Rn.Vector3.fromCopyArray3([-1, 1, 1])
  if (!scenario.renderSkybox) {
    sphereEntity.getSceneGraph().isVisible = false
  }

  const renderPass = new Rn.RenderPass()
  renderPass.clearColor = Rn.Vector4.fromCopyArray4([0, 0, 0, 0])
  renderPass.addEntities([sphereEntity])
  // renderPass.cameraComponent = cameraComponent
  renderPass.toClearDepthBuffer = false
  renderPass.isDepthTest = true
  renderPass.toClearColorBuffer = false
  renderPass.setFramebuffer(framebufferTargetOfGammaMsaa)

  const expression = new Rn.Expression()
  expression.tryToSetUniqueName('EnvCube', true);
  expression.addRenderPasses([renderPass])

  frame.addExpression(expression);
  // frame;
  return expression
}
