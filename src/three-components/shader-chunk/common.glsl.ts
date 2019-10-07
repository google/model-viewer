/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {GammaEncoding, LinearEncoding, RGBDEncoding, RGBEEncoding, RGBM16Encoding, RGBM7Encoding, sRGBEncoding} from 'three';

import {texelConversions} from './encodings_pars_fragment.glsl.js';

// These shader functions convert between the UV coordinates of a single face of
// a cubemap, the 0-5 integer index of a cube face, and the direction vector for
// sampling a textureCube (not generally normalized).

// getDirectionChunk handles uv coordinates that are beyond [0, 1] in either x
// or y (not both) by wrapping around to the neighboring face.

export const getDirectionChunk = /* glsl */ `
vec3 getDirection(vec2 uv, float face) {
    uv = 2.0 * uv - 1.0;
    vec3 direction = vec3(uv, 1.0);
    if (face == 0.0) {
      direction = direction.zyx;
      direction.z *= -1.0;
    } else if (face == 1.0) {
      direction = direction.xzy;
      direction.z *= -1.0;
    } else if (face == 3.0) {
      direction = direction.zyx;
      direction.x *= -1.0;
    } else if (face == 4.0) {
      direction = direction.xzy;
      direction.y *= -1.0;
    } else if (face == 5.0) {
      direction.xz *= -1.0;
    }
    return direction;
}
`;

export const getFaceChunk = /* glsl */ `
float getFace(vec3 direction) {
    vec3 absDirection = abs(direction);
    float face = -1.0;
    if (absDirection.x > absDirection.z) {
      if (absDirection.x > absDirection.y)
        face = direction.x > 0.0 ? 0.0 : 3.0;
      else
        face = direction.y > 0.0 ? 1.0 : 4.0;
    } else {
      if (absDirection.z > absDirection.y)
        face = direction.z > 0.0 ? 2.0 : 5.0;
      else
        face = direction.y > 0.0 ? 1.0 : 4.0;
    }
    return face;
}
`;

export const getUVChunk = /* glsl */ `
vec2 getUV(vec3 direction, float face) {
    vec2 uv;
    if (face == 0.0) {
      uv = vec2(-direction.z, direction.y) / abs(direction.x);
    } else if (face == 1.0) {
      uv = vec2(direction.x, -direction.z) / abs(direction.y);
    } else if (face == 2.0) {
      uv = direction.xy / abs(direction.z);
    } else if (face == 3.0) {
      uv = vec2(direction.z, direction.y) / abs(direction.x);
    } else if (face == 4.0) {
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
