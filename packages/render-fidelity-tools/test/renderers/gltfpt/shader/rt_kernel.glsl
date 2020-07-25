/* @license
 * Copyright 2020  Dassault Systèmes - All Rights Reserved.
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
 
struct Ray {
    vec3 dir;
    vec3 org;
    float tfar;
    vec3 inv_dir;
    ivec3 sign;
};

struct HitInfo {
    int triIndex;
    float tfar;
    vec2 uv;
};


Ray createRay(in vec3 direction, in vec3 origin, in float tfar) {
    vec3 inv_direction = vec3(1.0) / direction;

    return Ray(
        direction,
        origin,
        tfar,
        inv_direction,
        ivec3((inv_direction.x < 0.0) ? 1 : 0,
         (inv_direction.y < 0.0) ? 1 : 0,
         (inv_direction.z < 0.0) ? 1 : 0)
    );
}

bool intersectAABB(const in Ray ray, const in vec3 aabb[2], out float tmin, out float tmax) {
    float tymin, tymax, tzmin, tzmax;
    tmin = (aabb[ray.sign[0]].x - ray.org.x) * ray.inv_dir.x;
    tmax = (aabb[1-ray.sign[0]].x - ray.org.x) * ray.inv_dir.x;
    tymin = (aabb[ray.sign[1]].y - ray.org.y) * ray.inv_dir.y;
    tymax = (aabb[1-ray.sign[1]].y - ray.org.y) * ray.inv_dir.y;
    tzmin = (aabb[ray.sign[2]].z - ray.org.z) * ray.inv_dir.z;
    tzmax = (aabb[1-ray.sign[2]].z - ray.org.z) * ray.inv_dir.z;
    tmin = max(max(tmin, tymin), tzmin);
    tmax = min(min(tmax, tymax), tzmax);
    return (tmin <= tmax); // we have an intersection; no intersection if tmin > tmax
}



// std. moeller trumbore triangle intersection test
bool intersectTriangle(const in Ray r, in vec3 p0, in vec3 p1, in vec3 p2, const in float tfar, out float t, out vec2 uv) {
    vec3 e0 = p1 - p0;
    vec3 e1 = p2 - p0;
    vec3 pvec = cross(r.dir, e1);
    float det = dot(e0, pvec);
    if(abs(det) < EPSILON) { // intersect backfaces
        // if(a < EPSILON) // skip backfaces
        return false;
    }
    float f = 1.0 / det;
    vec3  s = r.org - p0;
    float u = f * dot(s, pvec);

    if(u < 0.0 || u > 1.0)
        return false;

    vec3  qvec = cross(s, e0);
    float v = f * dot(r.dir, qvec);
    if(v < 0.0 || u + v > 1.0)
        return false;
    t = f * dot(e1, qvec);

    if (t < EPSILON)
        return false;

    uv = vec2(u, v);
    return (t > 0.0) && (t < tfar);
}

uint getMaterialIndex(const in uint triIndex) {
     uint idx_x0 = (triIndex*3u + 0u) % u_int_MaxTextureSize;
     uint idx_y0 = (triIndex*3u + 0u) / u_int_MaxTextureSize;

     return uint(texelFetch(u_sampler2D_TriangleData, ivec2(idx_x0, idx_y0), 0).w);
}

void getSceneTriangle(const in uint index, out vec3 p0, out vec3 p1, out vec3 p2) {
    ivec2 idx0 = getStructParameterTexCoord(index, 0u, 3u);
    ivec2 idx1 = getStructParameterTexCoord(index, 1u, 3u);
    ivec2 idx2 = getStructParameterTexCoord(index, 2u, 3u);

    p0 = texelFetch(u_sampler2D_TriangleData, idx0, 0).xyz;
    p1 = texelFetch(u_sampler2D_TriangleData, idx1, 0).xyz;
    p2 = texelFetch(u_sampler2D_TriangleData, idx2, 0).xyz;
}

vec3 calculateInterpolatedTangent(const in uint index, const in vec2 uv) {
    ivec2 idx0 = getStructParameterTexCoord(index, 0u, 3u);
    ivec2 idx1 = getStructParameterTexCoord(index, 1u, 3u);
    ivec2 idx2 = getStructParameterTexCoord(index, 2u, 3u);

    mat3 tangents;
    tangents[0] = texelFetch(u_sampler2D_TangentData, idx0, 0).xyz;
    tangents[1] = texelFetch(u_sampler2D_TangentData, idx1, 0).xyz;
    tangents[2] = texelFetch(u_sampler2D_TangentData, idx2, 0).xyz;

    return normalize((1.0 - uv.x - uv.y) * tangents[0] + uv.x * tangents[1] + uv.y * tangents[2]);
}


vec3 calculateInterpolatedNormal(const in uint index, const in vec2 uv) {
    ivec2 idx0 = getStructParameterTexCoord(index, 0u, 3u);
    ivec2 idx1 = getStructParameterTexCoord(index, 1u, 3u);
    ivec2 idx2 = getStructParameterTexCoord(index, 2u, 3u);

    mat3 normals;
    normals[0] = texelFetch(u_sampler2D_NormalData, idx0, 0).xyz;
    normals[1] = texelFetch(u_sampler2D_NormalData, idx1, 0).xyz;
    normals[2] = texelFetch(u_sampler2D_NormalData, idx2, 0).xyz;

    return normalize((1.0 - uv.x - uv.y) * normals[0] + uv.x * normals[1] + uv.y * normals[2]);
}

vec2 calculateInterpolatedUV(const in uint index, const in vec2 hit_uv, int set) {
    ivec2 idx0 = getStructParameterTexCoord(index, 0u, 3u);
    ivec2 idx1 = getStructParameterTexCoord(index, 1u, 3u);
    ivec2 idx2 = getStructParameterTexCoord(index, 2u, 3u);

    vec2 uv0, uv1, uv2;
    if(set == 0) {
        uv0 = texelFetch(u_sampler2D_UVData, idx0, 0).xy;
        uv1 = texelFetch(u_sampler2D_UVData, idx1, 0).xy;
        uv2 = texelFetch(u_sampler2D_UVData, idx2, 0).xy;
    } else {
        uv0 = texelFetch(u_sampler2D_UVData, idx0, 0).zw;
        uv1 = texelFetch(u_sampler2D_UVData, idx1, 0).zw;
        uv2 = texelFetch(u_sampler2D_UVData, idx2, 0).zw;
    }

    return (1.0 - hit_uv.x - hit_uv.y) * uv0 + hit_uv.x * uv1 + hit_uv.y * uv2;
}

bool bvh_IntersectRayBox(const in Ray r, const in float tfar, int pn, out int si, out int ei) {
    int idx_x0 = int(pn*2+0) % int(u_int_MaxTextureSize);
    int idx_y0 = int(pn*2+0) / int(u_int_MaxTextureSize);

    int idx_x1 = int(pn*2+1) % int(u_int_MaxTextureSize);
    int idx_y1 = int(pn*2+1) / int(u_int_MaxTextureSize);

    vec4 nodeA = texelFetch(u_sampler2D_BVHData, ivec2(idx_x0, idx_y0), 0);
    vec4 nodeB = texelFetch(u_sampler2D_BVHData, ivec2(idx_x1, idx_y1), 0);
    vec3 aabb[2];
    aabb[0] = nodeA.xyz;
    aabb[1] = nodeB.xyz;
    si = int(nodeA.w);
    ei = int(nodeB.w);

    float tmin, tmax;
    bool hasHit = intersectAABB(r, aabb, tmin, tmax);

    //!!TODO: check if this has correct semantics for rays that start inside the box?
    return hasHit && ((/*tmin > 0.0 && */tmin <= tfar) || (tmin < 0.0 && tmax <= tfar));
}


/*!!TODO/!!TOOPT:
    - sort out the many tfars
    - sort the needed data in ray payload and return values
*/
bool intersectSceneTriangles_BVH(const in Ray r, out HitInfo hit) {
    hit.tfar = r.tfar;
    hit.triIndex = -1;

    int stack[32];
    int top = 1;
    int pn = 0;

    float tfar = r.tfar;
    bool foundHit = false;
    int si, ei;

    while (top > 0 && top < 32) {
        if (bvh_IntersectRayBox(r, tfar, pn, si, ei)) {

            if (si > 0) { // intermediate node
                // !!TOOPT: sort front to back based on ray sign (but this needs additional data in nodes based on construction)
                pn = si;
                stack[top++] = ei;
            } else { // leaf node
                for (int i = -si; i < -ei; i++) {
                    float t = 0.0;
                    vec2 uv;
                    vec3 p0, p1, p2;
                    getSceneTriangle(uint(i), p0, p1, p2);
                    if (intersectTriangle(r, p0, p1, p2, hit.tfar, t, uv)) {
                        hit.tfar = t;
                        hit.triIndex = i;
                        hit.uv = uv;
                        foundHit = true;
                        tfar = t;
                    }
                }

                pn = stack[--top];
            }

        } else {
            pn = stack[--top];
        }
    }

    return foundHit;
}


bool intersectSceneTriangles_Bruteforce(const in Ray r, out HitInfo hit) {
    hit.tfar = r.tfar;
    hit.triIndex = -1;

    for (int i = 0; i < int(u_int_NumTriangles); i++) {
        vec3 p0, p1, p2;
        getSceneTriangle(uint(i), p0, p1, p2);

        float t = 0.0;
        vec2 uv;
        if (intersectTriangle(r, p0, p1, p2, hit.tfar, t, uv)) {
            hit.tfar = t;
            hit.triIndex = i;
            hit.uv = uv;
        } else {
        }
    }

    return hit.triIndex >= 0;
}

bool intersectScene_Nearest(const in Ray r, out HitInfo hit) {
    //return intersectSceneTriangles_Bruteforce(r, hit);
    return intersectSceneTriangles_BVH(r, hit);
}

bool isVisible(const in vec3 p0, const in vec3 p1) {
    //Ray r = createRay(p1-p0, p0, 1.0);
    Ray r = createRay(normalize(p1-p0), p0, length(p1-p0));

    HitInfo hit;
    return !intersectScene_Nearest(r, hit); //!!TOOPT: add an early hit function here
}