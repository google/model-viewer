import {getFaceChunk, getUVChunk} from './common.glsl.js';

export const cubeUVChunk = /* glsl */ `
#ifdef ENVMAP_TYPE_CUBE_UV

const float cubeUV_maxMipLevel = 8.0;
const float cubeUV_minMipLevel = 2.0;
const float cubeUV_maxSize = exp2(cubeUV_maxMipLevel);
const float cubeUV_minSize = exp2(cubeUV_minMipLevel);
const vec2 texelSize =
  1.0 / vec2(3.0 * (cubeUV_maxSize + 2.0), 
             4.0 * (cubeUV_maxMipLevel + cubeUV_maxSize) + 2.0);

${getFaceChunk}
${getUVChunk}

vec3 bilinearCubeUV(sampler2D envMap, vec3 direction, float filterInt, float mipInt) {
  int face = getFace(direction);
  float faceSize = exp2(mipInt);

  vec2 uv = getUV(direction, face) * faceSize;
  uv += 0.5;
  vec2 f = fract(uv);
  uv += 0.5 - f;
  if (face > 2) {
    uv.y += faceSize + 2.0;
    face -= 3;
  }
  uv.x += float(face) * (faceSize + 2.0);
  uv.y += 4.0 * (mipInt - 1.0) + 2.0 * faceSize + 2.0;
  uv.x += filterInt * 3.0 * (cubeUV_minSize + 2.0);
  uv *= texelSize;
  uv.y = 1.0 - uv.y;

  vec3 tl = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
  uv.x += texelSize.x;
  vec3 tr = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
  uv.y -= texelSize.y;
  vec3 br = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
  uv.x -= texelSize.x;
  vec3 bl = envMapTexelToLinear(texture2D(envMap, uv)).rgb;
  vec3 tm = mix(tl, tr, f.x);
  vec3 bm = mix(bl, br, f.x);
  return mix(tm, bm, f.y);
}

vec3 trilinearCubeUV(sampler2D envMap, vec3 direction, float filterInt, float mipInt, float f){
  vec3 color0 = bilinearCubeUV(envMap, direction, filterInt, mipInt);
  if (f == 0.0) {
    return color0;
  } else {
    vec3 color1 = bilinearCubeUV(envMap, direction, filterInt, mipInt + 1.0);
    return mix(color0, color1, f);
  }
}

vec4 textureCubeUV(sampler2D envMap, vec3 sampleDir, float roughness) {	
  float filterF = 0.0;
  float filterInt = 0.0;
  if(roughness >= 0.7){
    filterF = (roughness - 0.7) / (1.0 - 0.7);
    filterInt = 2.0;
  } else if(roughness >= 0.5){
    filterF = (roughness - 0.5) / (0.7 - 0.5);
    filterInt = 1.0;
  } else if(roughness >= 0.32){
    filterF = (roughness - 0.32) / (0.5 - 0.32);
  }

  roughness = min(roughness, 0.32);
  float sigma = PI * roughness * roughness / ( 1.0 + roughness );

  // Add anti-aliasing mipmap contribution
  vec3 dxy = max(abs(dFdx(sampleDir)), abs(dFdy(sampleDir)));
  sigma += max(max(dxy.x, dxy.y), dxy.z);

  float mip = clamp(-log2(sigma), 2.0, cubeUV_maxMipLevel);
  float mipF = fract(mip);
  float mipInt = floor(mip);

  vec3 color0 = trilinearCubeUV(envMap, sampleDir, filterInt, mipInt, mipF);
  if (filterF == 0.0) {
    return vec4(color0, 1.0);
  } else {
    vec3 color1 = trilinearCubeUV(envMap, sampleDir, filterInt + 1.0, mipInt, mipF);
    return vec4(mix(color0, color1, filterF), 1.0);
  }
}
#endif
`;
