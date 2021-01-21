Khronos glTF 2.0 Sample Viewer
==============================

This is the official [Khronos](https://www.khronos.org/) [glTF 2.0](https://www.khronos.org/gltf/) Sample Viewer using [WebGL](https://www.khronos.org/webgl/): [glTF 2.0 Sample Viewer](http://gltf.ux3d.io/)


**Table of Contents**

- [Version](#version)
- [Credits](#credits)
- [Features](#features)
- [Setup](#setup)
- [Physically-Based Materials in glTF 2.0](#physically-based-materials-in-gltf-20)
- [Appendix A Metallic-Roughness Material](#appendix-a-metallic-roughness-material)
  - [Specular Term](#specular-term-f_specular)
  - [Diffuse Term](#diffuse-term)
- [Appendix B FAQ](#appendix-b-faq)

See also the [proposal for API and UI enhancements](documentation)

Version
-------

Development for PBR next phase one

Credits
-------

Refactored and developed by [UX3D](https://www.ux3d.io/). Supported by the [Khronos Group](https://www.khronos.org/) and by [Google](https://www.google.com/) for the glTF Draco mesh compression import.
Original code based on the former [glTF-WebGL-PBR](https://github.com/KhronosGroup/glTF-Sample-Viewer/tree/glTF-WebGL-PBR) project. Previously supported by [Facebook](https://www.facebook.com/) for animations, skinning and morphing.

Features
========

- [x] glTF 2.0
- [x] [KHR_draco_mesh_compression](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_draco_mesh_compression)
- [x] [KHR_lights_punctual](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual)
- [x] [KHR_materials_clearcoat](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_clearcoat)
- [x] [KHR_materials_pbrSpecularGlossiness](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness)
- [x] [KHR_materials_sheen](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_sheen)
- [x] [KHR_materials_transmission](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_transmission)
- [x] [KHR_materials_unlit](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit)
- [x] [KHR_materials_variants](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_variants)
- [x] [KHR_mesh_quantization](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization)
- [x] [KHR_texture_basisu](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_basisu)
- [x] [KHR_texture_transform](https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_transform)
- [ ] KHR_xmp_ld



Setup
======

Web based
---------
An example on how to implement the npm package on a webpage can be found [here (TODO: change link to app_web)]()
- If you want to support the `KHR_texture_basisu` extension, you need to add the following library to your html file before calling the main app: \
    `<script src="node_modules/gltf-sample-viewer/libs/libktx.js"></script>` \
    After initalizing the GltfView, the KTX library has to be initilaized by calling: \
    `initKtxLib(view);`
- If you want to support the `KHR_draco_mesh_compression` extension, you need to add the following library to your html file before calling the main app: \
    `<script src="https://www.gstatic.com/draco/v1/decoders/draco_decoder_gltf.js"></script>` \
    The Draco library has to be initilaized by calling: \
    `initDracoLib();`

One can also use own versions of these libraries and pass the required object in the init function as last argument.

Link to the live [glTF 2.0 Sample Viewer](http://gltf.ux3d.io/).

Headless
--------
An example on how to implement the npm package in a headless state can be found [here (TODO: change link to app_headless)]()


Physically-Based Materials in glTF 2.0
======================================

With the change from glTF 1.0 to glTF 2.0, one of the largest changes included core support for materials that could be used for physically-based shading. Part of this process involved choosing technically accurate, yet user-friendly, parameters for which developers and artists could use intuitively. This resulted in the introduction of the **Metallic-Roughness Material** to glTF. If you would like to read more about glTF, you can find the content at its [GitHub page](https://github.com/KhronosGroup/glTF).

A good reference about Physically-Based Materials and its workflow can be found on the [THE PBR GUIDE - PART 1](https://academy.allegorithmic.com/courses/the-pbr-guide-part-1) and [THE PBR GUIDE - PART 2](https://academy.allegorithmic.com/courses/the-pbr-guide-part-2) from [allegorithmic](https://www.allegorithmic.com).

For implementation details and further theory, please find more information in the [Real Shading in Unreal Engine 4](https://blog.selfshadow.com/publications/s2013-shading-course/) presentation from the SIGGRAPH 2013 course.


Appendix A: Metallic-Roughness Material
=======================================

For further reference, please read the [glTF 2.0: Appendix B: BRDF Implementation](https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#appendix-b-brdf-implementation)
The following sections do summarize the important shader code.

```glsl
vec3 F_specular = D * Vis * F;
vec3 F_diffuse = (1.0 - F) * diffuse;
vec3 F = F_specular + F_diffuse;
```

Please note: Vis = G / (4 * NdotL * NdotV)

## Specular Term (F_specular)

**Microfacet metallic-roughness BRDF**

```glsl
vec3 metallicBRDF (vec3 f0, vec3 f90, float alphaRoughness, float VdotH, float NdotL, float NdotV, float NdotH)
{
    vec3 F = fresnel(f0, f90, VdotH);
    float Vis = V_GGX(NdotL, NdotV, alphaRoughness);
    float D = D_GGX(NdotH, alphaRoughness);

    return F * Vis * D;
}
```

### Surface Reflection Ratio (F)

**Fresnel Schlick**

```glsl
vec3 fresnel(vec3 f0, vec3 f90, float VdotH)
{
    return f0 + (f90 - f0) * pow(clamp(1.0 - VdotH, 0.0, 1.0), 5.0);
}
```

Please note, that the above shader code includes the optimization for "turning off" the Fresnel edge brightening (see "Real-Time Rendering" Fourth Edition on page 325).

### Geometric Occlusion / Visibility (V)

**Smith Joint GGX**

```glsl
float V_GGX(float NdotL, float NdotV, float alphaRoughness)
{
    float alphaRoughnessSq = alphaRoughness * alphaRoughness;

    float GGXV = NdotL * sqrt(NdotV * NdotV * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);
    float GGXL = NdotV * sqrt(NdotL * NdotL * (1.0 - alphaRoughnessSq) + alphaRoughnessSq);

    float GGX = GGXV + GGXL;
    if (GGX > 0.0)
    {
        return 0.5 / GGX;
    }
    return 0.0;
}
```

### Normal Distribution (D)

**Trowbridge-Reitz GGX**

```glsl
float D_GGX(float NdotH, float alphaRoughness)
{
    float alphaRoughnessSq = alphaRoughness * alphaRoughness;
    float f = (NdotH * NdotH) * (alphaRoughnessSq - 1.0) + 1.0;
    return alphaRoughnessSq / (M_PI * f * f);
}
```

## Diffuse Term (F_diffuse)

**Lambertian**

```glsl
vec3 lambertian(vec3 f0, vec3 f90, vec3 diffuseColor, float VdotH)
{
    return (1.0 - fresnel(f0, f90, VdotH)) * (diffuseColor / M_PI);
}
```

Appendix B: FAQ
===============

Q: Why do I not see environment lighting here [https://github.khronos.org/glTF-Sample-Viewer/](https://github.khronos.org/glTF-Sample-Viewer/)?
A: The glTF Sample Viewer is using [KTX2](http://github.khronos.org/KTX-Specification/) for the pre-filtered environments. However, the mime type is not yet registered [here](https://github.com/jshttp/mime-db).

