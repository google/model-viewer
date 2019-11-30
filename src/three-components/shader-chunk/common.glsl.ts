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

// These defines are used for the following three functions, but must be
// declared only once, so ensure this is included just above where these
// conversion functions are included. These values must agree with
// EXTRA_LOD_ROUGHNESS and EXTRA_LOD_SIGMA from PMREMGenerator.
export const varianceDefines = /* glsl */ `
#define r0 1.0
#define v0 0.339
#define m0 -2.0
#define r1 0.8
#define v1 0.276
#define m1 -1.0
#define r4 0.4
#define v4 0.046
#define m4 2.0
#define r5 0.305
#define v5 0.016
#define m5 3.0
#define r6 0.21
#define v6 0.0038
#define m6 4.0
`

export const roughnessToVariance = /* glsl */ `
float roughnessToVariance(float roughness) {
  float variance = 0.0;
  if (roughness >= r1) {
    variance = (r0 - roughness) * (v1 - v0) / (r0 - r1) + v0;
  } else if (roughness >= r4) {
    variance = (r1 - roughness) * (v4 - v1) / (r1 - r4) + v1;
  } else if (roughness >= r5) {
    variance = (r4 - roughness) * (v5 - v4) / (r4 - r5) + v4;
  } else {
    float roughness2 = roughness * roughness;
    variance = 1.79 * roughness2 * roughness2;
  }
  return variance;
}
`;

export const varianceToRoughness = /* glsl */ `
float varianceToRoughness(float variance) {
  float roughness = 0.0;
  if (variance >= v1) {
    roughness = (v0 - variance) * (r1 - r0) / (v0 - v1) + r0;
  } else if (variance >= v4) {
    roughness = (v1 - variance) * (r4 - r1) / (v1 - v4) + r1;
  } else if (variance >= v5) {
    roughness = (v4 - variance) * (r5 - r4) / (v4 - v5) + r4;
  } else {
    roughness = pow(0.559 * variance, 0.25);// 0.559 = 1.0 / 1.79
  }
  return roughness;
}
`;

export const roughnessToMip = /* glsl */ `
float roughnessToMip(float roughness) {
  float mip = 0.0;
  if (roughness >= r1) {
    mip = (r0 - roughness) * (m1 - m0) / (r0 - r1) + m0;
  } else if (roughness >= r4) {
    mip = (r1 - roughness) * (m4 - m1) / (r1 - r4) + m1;
  } else if (roughness >= r5) {
    mip = (r4 - roughness) * (m5 - m4) / (r4 - r5) + m4;
  } else if (roughness >= r6) {
    mip = (r5 - roughness) * (m6 - m5) / (r5 - r6) + m5;
  } else {
    mip = -2.0 * log2(1.16 * roughness);// 1.16 = 1.79^0.25
  }
  return mip;
}
`;