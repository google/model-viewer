import {Mesh, OrthographicCamera, PlaneBufferGeometry, Scene, ShaderMaterial, Texture, WebGLRenderTarget} from 'three';

import {Renderer} from './Renderer';

export interface ModelViewerRendererDebugDetails {
  renderer: Renderer;
  THREE: {
    ShaderMaterial: Constructor<ShaderMaterial>;
    PlaneBufferGeometry: Constructor<PlaneBufferGeometry>;
    OrthographicCamera: Constructor<OrthographicCamera>;
    WebGLRenderTarget: Constructor<WebGLRenderTarget>;
    Texture: Constructor<Texture>;
    Scene: Constructor<Scene>;
    Mesh: Constructor<Mesh>;
  };
}

/**
 * This Debugger exposes internal details of the <model-viewer> rendering
 * substructure so that external tools can more easily inspect and operate on
 * them.
 *
 * It also activates shader debugging on the associated GL context. Shader
 * debugging trades performance for useful error information, so it is not
 * recommended to activate this unless needed.
 */
export class Debugger {
  constructor(renderer: Renderer) {
    renderer.renderer.debug = {checkShaderErrors: true};
    Promise.resolve().then(() => {
      self.dispatchEvent(new CustomEvent<ModelViewerRendererDebugDetails>(
          'model-viewer-renderer-debug', {
            detail: {
              renderer,
              THREE: {
                ShaderMaterial,
                Texture,
                Mesh,
                Scene,
                PlaneBufferGeometry,
                OrthographicCamera,
                WebGLRenderTarget
              }
            }
          }));
    });
  }
}
