export default /* glsl */ `
#ifdef ENVMAP_TYPE_CUBE_UV

#define cubeUV_faceSize (256.0)
#define cubeUV_maxMipLevel (8.0)

float getOffset(float mipInt) {
  return 4.0 * mipInt + 2.0 * (exp2(mipInt) - 1.0);
}

const vec2 cubeUV_scale =
    1.0 / vec2(3.0 * (cubeUV_faceSize + 2.0), getOffset(cubeUV_maxMipLevel));

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

vec2 getUV(vec3 direction, int face) {
  vec2 uv;
  if (face == 0) {
    uv = direction.yz;
  } else if (face == 1) {
    uv = direction.xz;
  } else if (face == 2) {
    uv = direction.xy;
  } else if (face == 3) {
    uv = direction.yz;
  } else if (face == 4) {
    uv = direction.xz;
  } else {
    uv = direction.xy;
  }
  return 0.5 * (uv + 1.0);
}

float defaultMipmap(vec3 direction) {
  int face = getFace(direction);
  vec2 uv = getUV(direction, face);
  vec2 dx = dFdx(uv);
  vec2 dy = dFdy(uv);
  float deltaMaxSqrt = max(dot(dx, dx), dot(dy, dy));
  return 0.5 * log2(deltaMaxSqrt);
}

vec3 fetchCube(vec2 uv, int face, float mipInt) {
  uv += 1.0;
  uv.x += float(face % 3) * (faceSize + 2.0);
  if (face > 2) {
    uv.y += faceSize + 2.0;
  }
  uv.y += getOffset(mipInt);
  uv *= cubeUV_scale;
  return envMapTexelToLinear(texture2D(envMap, uv)).rgb;
}

vec3 bilinearCubeUV(vec3 direction, float mipInt) {
  int face = getFace(direction);
  float faceSize = exp2(mipInt);
  vec2 faceUV = getUV(direction, face) * faceSize;

  vec2 f = fract(faceUV);
  faceUV -= f + 0.5;

  vec3 tl = fetchCube(faceUV, face, mipInt);
  vec3 tr = fetchCube(faceUV + vec2(1.0, 0.0), face, mipInt);
  vec3 bl = fetchCube(faceUV + vec2(0.0, 1.0), face, mipInt);
  vec3 br = fetchCube(faceUV + vec2(1.0, 1.0), face, mipInt);
  vec3 tm = mix(tl, tr, f.x);
  vec3 bm = mix(bl, br, f.x);
  return mix(tm, bm, f.y);
}

vec4 textureCubeUV(sampler2D envMap, vec3 reflectedDirection, float mipBias) {
  float mip = cubeUV_maxMipLevel - defaultMipmap(reflectedDirection) - mipBias;
  float f = fract(mip);
  float mipInt = floor(mip);

  vec3 color0 = bilinearCubeUV(reflectedDirection, mipInt);
  if (f == 0.0) {
    return vec4(color0, 1.0);
  } else {
    vec3 color1 = bilinearCubeUV(reflectedDirection, mipInt + 1.0);
    return vec4(mix(color0, color1, f), 1.0);
  }
}
#endif
`;
