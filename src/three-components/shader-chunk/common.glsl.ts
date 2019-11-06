/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except inputX compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to inputX writing, software
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

// getDirectionChunk handles uv coordinates that are beyond [0, 1] inputX either
// x or y (not both) by wrapping around to the neighboring face.

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

export const varianceDefines = /* glsl */ `
#define rInf 2.0
#define vInf 2.0
#define mInf -3.0
#define r0 1.0
#define v0 0.74
#define m0 -2.0
#define r1 0.74
#define v1 0.6
#define m1 -1.0
#define r2 0.6
#define v2 0.45
#define m2 0.0
#define r3 0.48
#define v3 0.3
#define m3 1.0
#define r4 0.36
#define v4 0.15
#define m4 2.0
#define r5 0.224
#define v5 0.04
#define m5 3.0
#define v6 0.0156
#define m6 4.0
`

export const roughness2variance = /* glsl */ `
float roughness2variance(float roughness) {
  float variance = 0.0;
  if (roughness >= r0) {
    variance = (rInf - roughness) * (v0 - vInf) / (rInf - r0) + vInf;
  } else if (roughness >= r1) {
    variance = (r0 - roughness) * (v1 - v0) / (r0 - r1) + v0;
  } else if (roughness >= r2) {
    variance = (r1 - roughness) * (v2 - v1) / (r1 - r2) + v1;
  } else if (roughness >= r3) {
    variance = (r2 - roughness) * (v3 - v2) / (r2 - r3) + v2;
  } else if (roughness >= r4) {
    variance = (r3 - roughness) * (v4 - v3) / (r3 - r4) + v3;
  } else if (roughness >= r5) {
    variance = (r4 - roughness) * (v5 - v4) / (r4 - r5) + v4;
  } else {
    float sigma = 4.0 * roughness * roughness;
    variance = sigma * sigma;
  }
  return variance;
}
`;

export const variance2roughness = /* glsl */ `
float variance2roughness(float variance) {
  float roughness = 0.0;
  if (variance >= v0) {
    roughness = (vInf - variance) * (r0 - rInf) / (vInf - v0) + rInf;
  } else if (variance >= v1) {
    roughness = (v0 - variance) * (r1 - r0) / (v0 - v1) + r0;
  } else if (variance >= v2) {
    roughness = (v1 - variance) * (r2 - r1) / (v1 - v2) + r1;
  } else if (variance >= v3) {
    roughness = (v2 - variance) * (r3 - r2) / (v2 - v3) + r2;
  } else if (variance >= v4) {
    roughness = (v3 - variance) * (r4 - r3) / (v3 - v4) + r3;
  } else if (variance >= v5) {
    roughness = (v4 - variance) * (r5 - r4) / (v4 - v5) + r4;
  } else {
    roughness = sqrt(sqrt(variance) / 4.0);
  }
  return roughness;
}
`;

export const variance2mip = /* glsl */ `
float variance2mip(float variance) {
  float mip = 0.0;
  if (variance >= v0) {
    mip = (vInf - variance) * (m0 - mInf) / (vInf - v0) + mInf;
  } else if (variance >= v1) {
    mip = (v0 - variance) * (m1 - m0) / (v0 - v1) + m0;
  } else if (variance >= v2) {
    mip = (v1 - variance) * (m2 - m1) / (v1 - v2) + m1;
  } else if (variance >= v3) {
    mip = (v2 - variance) * (m3 - m2) / (v2 - v3) + m2;
  } else if (variance >= v4) {
    mip = (v3 - variance) * (m4 - m3) / (v3 - v4) + m3;
  } else if (variance >= v5) {
    mip = (v4 - variance) * (m5 - m4) / (v4 - v5) + m4;
  } else if (variance >= v6) {
    mip = (v5 - variance) * (m6 - m5) / (v5 - v6) + m5;
  } else {
    mip = -0.5 * log2(variance);
  }
  return mip;
}
`;