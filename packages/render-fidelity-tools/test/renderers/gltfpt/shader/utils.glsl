/* @license
 * Copyright 2020  Dassault Systemes - All Rights Reserved.
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
 
 const mat3 y_to_z_up = mat3(1,0,0, 0,0,1, 0,-1,0);
 
// Bends shading normal n into the direction of the geometry normal ng
// such that incident direction wi reflected at n does not change
// hemisphere
vec3 clamp_normal(vec3 n, vec3 ng, vec3 wi)
{
    vec3 ns_new = n;
    vec3 r = reflect(-wi, n); // TODO CHECK
    float v_dot_ng = dot(wi, ng);
    float r_dot_ng = dot(r, ng);

    //if wi and r are in different hemisphere in respect of geometry normal
    if(v_dot_ng * r_dot_ng < 0.0) {
        float ns_dot_ng = abs(dot(n, ng));
        vec3 offset_vec = n * (-r_dot_ng / ns_dot_ng);
        vec3 r_corrected = normalize(r + offset_vec);//move r on horizon
        r_corrected = normalize(r_corrected + (ng * EPS_NORMAL)*((v_dot_ng > 0.0)?1.0:-1.0));//to avoid precision problems
        ns_new = normalize(wi + r_corrected);
        ns_new *= (dot(ns_new, n) < 0.0)? -1.0 : 1.0;
    }
    return ns_new;
}

// Flips normal n and geometry normal ng such that they point into
// the direction of the given incident direction wi.
// This function should be called in each sample/eval function to prepare
// the tangent space in a way that the BSDF looks the same from top and
// bottom (two-sided materials).
void fix_normals(inout vec3 n, inout vec3 ng, in vec3 wi) {
    ng = dot(wi, ng) < 0.0 ? -ng : ng;
    n = dot(n, ng) < 0.0 ? -n : n;
}

vec3 fix_normal(inout vec3 n, in vec3 wi) {
    return dot(n, wi) < 0.0 ? -n : n;
}

float sum(vec3 v) {
    return dot(vec3(1.0), v);
}

mat3 get_onb(vec3 n) {
  // from Spencer, Jones "Into the Blue", eq(3)
  vec3 tangent = normalize(cross(n, vec3(-n.z, n.x, -n.y)));
  vec3 bitangent = cross(n, tangent);
  return mat3(tangent, bitangent, n);
}

mat3 get_onb(vec3 n, vec3 t) {
    vec3 b = normalize(cross(n, t));
    vec3 tt = cross(b, n);
    return mat3(tt, b, n);
}

// (float3, float3) get_onb(float3 n, float3 t) {
//   b = normalize(cross(n, t));
//   t = cross(b, n);
//   return (t, b);
// };

// mat3 get_onb2(vec3 n) {
//     // http://orbit.dtu.dk/files/126824972/onb_frisvad_jgt2012_v2.pdf
//     vec3 b1, b2;
//     if (n.z < -0.9999999) // Handle the singularity
//     {
//         b1 = vec3(0.0, -1.0, 0.0);
//         b2 = vec3(-1.0, 0.0, 0.0);
//          return mat3(b1, b2, n);
//     }
//     float a = 1.0 / (1.0 + n.z);
//     float b = -n.x*n.y*a;
//     b1 = vec3(1.0f - n.x*n.x*a, -n.x, b);
//     b2 = vec3(b, 1.0 - n.y*n.y*a, -n.y);

//     return mat3(b1, b2, n);
// }


vec3 compute_triangle_normal(in vec3 p0, in vec3 p1, in vec3 p2) {
    vec3 e0 = p1 - p0;
    vec3 e1 = p2 - p0;
    return normalize(cross(e1, e0));
}

float max_(vec3 v) {
    return max(v.x, max(v.y, v.z));
}

bool same_hemisphere(const in vec3 wi, const in vec3 wo) {
    return wi.z * wo.z > 0.0;
}

vec3 rotation_to_tangent(float anisotropy_rotation_angle, vec3 normal, vec3 tangent)
{
    if (anisotropy_rotation_angle > 0.0) {
        float angle = anisotropy_rotation_angle;
        vec3 bitangent = cross(normal, tangent);
        return tangent * cos(angle) + bitangent * sin(angle);
    } else {
        return tangent;
    }
}

ivec2 getStructParameterTexCoord(uint structIdx, uint paramIdx, uint structStride) {
    return ivec2(
        (structIdx*structStride + paramIdx) % u_int_MaxTextureSize,
        (structIdx*structStride + paramIdx) / u_int_MaxTextureSize
    );
}
