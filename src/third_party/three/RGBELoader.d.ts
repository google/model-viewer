import {DataTextureLoader, LoadingManager, TextureDataType} from 'three';

export class RGBELoader extends DataTextureLoader {
  constructor(manager: LoadingManager);

  setType(value: TextureDataType): RGBELoader;
}