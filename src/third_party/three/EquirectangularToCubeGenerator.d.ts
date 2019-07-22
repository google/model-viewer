import {PixelFormat, Texture, TextureDataType, TextureFilter, WebGLRenderer, WebGLRenderTarget, WebGLRenderTargetCube} from 'three';

export interface CubemapGeneratorOptions {
  resolution?: number;
  generateMipmaps?: boolean;
  minFilter?: TextureFilter;
  magFilter?: TextureFilter;
}

export class CubemapGenerator {
  constructor(renderer: WebGLRenderer);
  public fromEquirectangular(
      texture: Texture,
      options?: CubemapGeneratorOptions): WebGLRenderTargetCube;
}

export interface EquirectangularToCubeGeneratorOptions {
  resolution?: number;
  format?: PixelFormat;
  type?: TextureDataType;
}

export class EquirectangularToCubeGenerator {
  public renderTarget: WebGLRenderTargetCube;

  constructor(
      sourceTexture: Texture, options: EquirectangularToCubeGeneratorOptions)

  update(renderer: WebGLRenderer): Texture;
  dispose(): void;
}