
import {MeshStandardMaterial, Texture as ThreeTexture} from 'three';

import {GLTF, Texture as GLTFTexture, TextureInfo as GLTFTextureInfo} from '../../three-components/gltf-instance/gltf-2.0.js';

import {Image} from './image.js';
import {Sampler} from './sampler.js';
import {TextureInfo, TextureUsage} from './texture-info.js';
import {Texture} from './texture.js';



export const $createTexture = Symbol('createTexture');
export const $createTextureInfo = Symbol('createTextureInfo');

/**
 * Helper class for creating Textures and TextureInfos.
 */
export class TextureFactory {
  // Creates context from Texture. This creats a texture with a valid
  static[$createTexture](threeTexture: ThreeTexture): Texture {
    // Creates an empty glTF data set, allows for creating a texture that's
    // not bound to a material.
    const emptyOnUpdate = () => {};
    return new Texture(
        emptyOnUpdate,
        new Sampler(emptyOnUpdate, threeTexture, null),
        new Image(emptyOnUpdate, threeTexture, null),
        threeTexture,
        null);
  }

  // A helper method for creating TextureInfo objects from gltf data.
  static[$createTextureInfo](
      onUpdate: () => void, usage: TextureUsage, gltf: GLTF,
      threeTexture: ThreeTexture|null, gltfTextureInfo: GLTFTextureInfo|null,
      correlatedMaterials: Set<MeshStandardMaterial>): TextureInfo {
    let gltfTexture: GLTFTexture|null = null;

    let texture: Texture|null = null;
    // Creates image, sampler and texture if valid texture info is provided.
    if (gltfTextureInfo) {
      gltfTexture = gltf.textures![gltfTextureInfo.index];

      const sampler = new Sampler(
          onUpdate,
          threeTexture,
          gltfTexture ? gltf.samplers![gltfTexture.sampler!] : null);

      const image = new Image(
          onUpdate,
          threeTexture,
          gltfTexture ? gltf.images![gltfTexture.source!] : null);

      texture =
          new Texture(onUpdate, sampler, image, threeTexture, gltfTexture);
    }

    // Creates a texture-info object, this provides access to the texture,
    // sampler, and image in the case of valid data. If an invalid (ie null)
    // texture is provided, than TextureInfo just acts as an interface
    // to set a valid texture at a later time.
    return new TextureInfo(
        onUpdate, usage, texture, correlatedMaterials, gltfTextureInfo);
  }
}
