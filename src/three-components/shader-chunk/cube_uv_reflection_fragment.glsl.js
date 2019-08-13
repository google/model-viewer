import {getFaceChunk, getUVChunk} from './common.glsl.js';

export const cubeUVChunk = /* glsl */ `
#ifdef ENVMAP_TYPE_CUBE_UV

#define cubeUV_faceSize (256.0)
#define cubeUV_maxMipLevel (8.0)
#define cubeUV_minMipLevel (2.0)
#define cubeUV_extraLevels (3.0)
#define cubeUV_lastLevel (9.0)

${getFaceChunk}
${getUVChunk}

float adjustMipLevelCubeUV(float mipLevel, float sigma) {
  if(sigma >= 0.91){
    mipLevel = -1.0 + (PI_HALF - sigma) / (PI_HALF - 0.91);
  } else if(sigma >= 0.52){
    mipLevel = 0.0 + (0.91 - sigma) / (0.91 - 0.52);
  } else if(sigma >= 0.25){
    mipLevel = 1.0 + (0.52 - sigma) / (0.52 - 0.25);
  }
  return cubeUV_maxMipLevel - mipLevel;
}

vec3 bilinearCubeUV(sampler2D envMap, vec3 direction, float mipInt) {
  vec2 texelSize =
    1.0 / vec2(3.0 * (cubeUV_faceSize + 2.0), 
               4.0 * (cubeUV_maxMipLevel + cubeUV_faceSize) + 2.0);
  
  int face = getFace(direction);
  mipInt = cubeUV_maxMipLevel - mipInt;
  float lodInt = max(mipInt, cubeUV_minMipLevel);
  float faceSize = exp2(lodInt);

  vec2 uv = getUV(direction, face) * faceSize;
  uv += 0.5;
  vec2 f = fract(uv);
  uv += 0.5 - f;
  if (face > 2) {
    uv.y += faceSize + 2.0;
    face -= 3;
  }
  uv.x += float(face) * (faceSize + 2.0);
  if(lodInt == mipInt){
    uv.y += 4.0 * mipInt + 2.0 * faceSize - 16.0;
  } else {
    uv.x += (lodInt - mipInt) * 3.0 * (faceSize + 2.0);
  }
  uv.y += 14.0;
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

vec4 textureCubeUV(sampler2D envMap, vec3 sampleDir, float roughness) {
  float sigma = PI * roughness * roughness / ( 1.0 + roughness );
		
  // Add anti-aliasing mipmap contribution
  vec3 dxy = max(abs(dFdx(sampleDir)), abs(dFdy(sampleDir)));
  sigma += max(max(dxy.x, dxy.y), dxy.z);

  float mipLevel = adjustMipLevelCubeUV(-log2(sigma), sigma);

  float mip = clamp(mipLevel, 0.0, cubeUV_lastLevel);
  float f = fract(mip);
  float mipInt = floor(mip);

  vec3 color0 = bilinearCubeUV(envMap, sampleDir, mipInt);
  if (f == 0.0) {
    return vec4(color0, 1.0);
  } else {
    vec3 color1 = bilinearCubeUV(envMap, sampleDir, mipInt + 1.0);
    return vec4(mix(color0, color1, f), 1.0);
  }
}
#endif
`;
