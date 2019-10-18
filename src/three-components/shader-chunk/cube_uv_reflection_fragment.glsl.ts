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

import {getFaceChunk, getUVChunk} from './common.glsl.js';

export const bilinearCubeUVChunk = /* glsl */ `
#define cubeUV_maxMipLevel 8.0
#define cubeUV_minMipLevel 4.0
#define cubeUV_maxTileSize 256.0
#define cubeUV_minTileSize 16.0
${getFaceChunk}
${getUVChunk}
vec3 bilinearCubeUV(sampler2D envMap, vec3 direction, float mipInt) {
  float face = getFace(direction);
  float filterInt = max(cubeUV_minMipLevel - mipInt, 0.0);
  mipInt = max(mipInt, cubeUV_minMipLevel);
  float faceSize = exp2(mipInt);

  float texelSize = 1.0 / (3.0 * cubeUV_maxTileSize);

  vec2 uv = getUV(direction, face) * (faceSize - 1.0);
  vec2 f = fract(uv);
  uv += 0.5 - f;
  if (face > 2.0) {
    uv.y += faceSize;
    face -= 3.0;
  }
  uv.x += face * faceSize;
  if(mipInt < cubeUV_maxMipLevel){
    uv.y += 2.0 * cubeUV_maxTileSize;
  }
  uv.y += filterInt * 2.0 * cubeUV_minTileSize;
  uv.x += 3.0 * max(0.0, cubeUV_maxTileSize - 2.0 * faceSize);
  uv *= texelSize;

  vec3 tl = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
  uv.x += texelSize;
  vec3 tr = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
  uv.y += texelSize;
  vec3 br = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
  uv.x -= texelSize;
  vec3 bl = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
  vec3 tm = mix(tl, tr, f.x);
  vec3 bm = mix(bl, br, f.x);
  return mix(tm, bm, f.y);
}
`;

export const cubeUVChunk = /* glsl */ `
#ifdef ENVMAP_TYPE_CUBE_UV

${bilinearCubeUVChunk}

vec4 textureCubeUV(sampler2D envMap, vec3 sampleDir, float roughness) {
  float filterMip = 0.0;
  if (roughness >= 0.7) {
    filterMip = (1.0 - roughness) / (1.0 - 0.7) - 5.0;
  } else if (roughness >= 0.5) {
    filterMip = (0.7 - roughness) / (0.7 - 0.5) - 4.0;
  } else if (roughness >= 0.32) {
    filterMip = (0.5 - roughness) / (0.5 - 0.32) - 3.0;
  } else if (roughness >= 0.22) {
    filterMip = (0.32 - roughness) / (0.32 - 0.22) - 2.0;
  } else if (roughness >= 0.15) {
    filterMip = (0.22 - roughness) / (0.22 - 0.15) - 1.0;
  }

  roughness = min(roughness, 0.15);
  float sigma = PI * roughness * roughness / (1.0 + roughness);

  // Add anti-aliasing mipmap contribution
  vec3 dxy = max(abs(dFdx(sampleDir)), abs(dFdy(sampleDir)));
  sigma += 0.5 * max(max(dxy.x, dxy.y), dxy.z);

  float mip =
      clamp(-log2(sigma), cubeUV_minMipLevel, cubeUV_maxMipLevel) + filterMip;
  float mipF = fract(mip);
  float mipInt = floor(mip);

  vec3 color0 = bilinearCubeUV(envMap, sampleDir, mipInt);
  if (mipF == 0.0) {
    return vec4(color0, 1.0);
  } else {
    vec3 color1 = bilinearCubeUV(envMap, sampleDir, mipInt + 1.0);
    return vec4(mix(color0, color1, mipF), 1.0);
  }
}
#endif
`;
