import {ACESFilmicToneMapping, CineonToneMapping, GammaEncoding, LinearEncoding, LinearToneMapping, ReinhardToneMapping, RGBDEncoding, RGBEEncoding, RGBM16Encoding, RGBM7Encoding, sRGBEncoding, Uncharted2ToneMapping} from 'three';

import {texelConversions} from './encodings_pars_framgment.glsl.js'
import {toneMappingChunk} from './tonemapping_pars_fragment.glsl.js'

// These shader functions convert between the UV coordinates of a single face of
// a cubemap, the 0-5 integer index of a cube face, and the direction vector for
// sampling a textureCube (not generally normalized).

export const getDirectionChunk = /* glsl */ `
vec3 getDirection(vec2 uv, int face) {
    uv = 2.0 * uv - 1.0;
    vec3 direction;
    if (face == 0) {
      direction = vec3(1.0, uv.y, -uv.x);
    } else if (face == 1) {
      direction = vec3(uv.x, 1.0, -uv.y);
    } else if (face == 2) {
      direction = vec3(uv, 1.0);
    } else if (face == 3) {
      direction = vec3(-1.0, uv.y, uv.x);
    } else if (face == 4) {
      direction = vec3(uv.x, -1.0, uv.y);
    } else {
      direction = vec3(-uv.x,uv.y, -1.0);
    }
    return direction;
}
`;

export const getFaceChunk = /* glsl */ `
int getFace(vec3 direction) {
    vec3 absDirection = abs(direction);
    int face = -1;
    if (absDirection.x > absDirection.z) {
      if (absDirection.x > absDirection.y)
        face = direction.x > 0.0 ? 0 : 3;
      else
        face = direction.y > 0.0 ? 1 : 4;
    } else {
      if (absDirection.z > absDirection.y)
        face = direction.z > 0.0 ? 2 : 5;
      else
        face = direction.y > 0.0 ? 1 : 4;
    }
    return face;
}
`;

export const getUVChunk = /* glsl */ `
vec2 getUV(vec3 direction, int face) {
    vec2 uv;
    if (face == 0) {
      uv = vec2(-direction.z, direction.y) / abs(direction.x);
    } else if (face == 1) {
      uv = vec2(direction.x, -direction.z) / abs(direction.y);
    } else if (face == 2) {
      uv = direction.xy / abs(direction.z);
    } else if (face == 3) {
      uv = vec2(direction.z, direction.y) / abs(direction.x);
    } else if (face == 4) {
      uv = direction.xz / abs(direction.y);
    } else {
      uv = vec2(-direction.x, direction.y) / abs(direction.z);
    }
    return 0.5 * (uv + 1.0);
}
`;

export const encodings = {
  [LinearEncoding]: 0,
  [sRGBEncoding]: 1,
  [RGBEEncoding]: 2,
  [RGBM7Encoding]: 3,
  [RGBM16Encoding]: 4,
  [RGBDEncoding]: 5,
  [GammaEncoding]: 6
};

export const texelIO = /* glsl */ `
uniform int inputEncoding;
uniform int outputEncoding;
${texelConversions}
vec4 inputTexelToLinear(vec4 value){
    if(inputEncoding == 0){
        return value;
    }else if(inputEncoding == 1){
        return sRGBToLinear(value);
    }else if(inputEncoding == 2){
        return RGBEToLinear(value);
    }else if(inputEncoding == 3){
        return RGBMToLinear(value, 7.0);
    }else if(inputEncoding == 4){
        return RGBMToLinear(value, 16.0);
    }else if(inputEncoding == 5){
        return RGBDToLinear(value, 256.0);
    }else{
        return GammaToLinear(value, 2.2);
    }
}
vec4 linearToOutputTexel(vec4 value){
    if(outputEncoding == 0){
        return value;
    }else if(outputEncoding == 1){
        return LinearTosRGB(value);
    }else if(outputEncoding == 2){
        return LinearToRGBE(value);
    }else if(outputEncoding == 3){
        return LinearToRGBM(value, 7.0);
    }else if(outputEncoding == 4){
        return LinearToRGBM(value, 16.0);
    }else if(outputEncoding == 5){
        return LinearToRGBD(value, 256.0);
    }else{
        return LinearToGamma(value, 2.2);
    }
}
`;

export const toneMappings = {
  [LinearToneMapping]: 0,
  [ReinhardToneMapping]: 1,
  [Uncharted2ToneMapping]: 2,
  [CineonToneMapping]: 3,
  [ACESFilmicToneMapping]: 4
};

export const toneMap = /* glsl */ `
${toneMappingChunk}
uniform int toneMappingFunction;
  vec3 toneMapping(vec3 value){
      if(toneMappingFunction == 0){
          return LinearToneMapping(value);
      }else if(toneMappingFunction == 1){
          return ReinhardToneMapping(value);
      }else if(toneMappingFunction == 2){
          return Uncharted2ToneMapping(value);
      }else if(toneMappingFunction == 3){
          return OptimizedCineonToneMapping(value);
      }else{
          return ACESFilmicToneMapping(value);
      }
  }
`;