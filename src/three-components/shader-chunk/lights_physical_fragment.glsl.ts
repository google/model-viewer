/**
 * @license MIT
 * @see https://github.com/mrdoob/three.js/blob/dev/LICENSE
 */

export const lightsChunk = /* glsl */ `
PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );

// (elalish) This block has been updated to add anti-aliasing.
material.specularRoughness = max(roughnessFactor, 0.0525);// 0.0525 corresponds to the base mip of a 256 cubemap.
vec3 dxy = max(abs(dFdx(geometryNormal)), abs(dFdy(geometryNormal)));
material.specularRoughness += max(max(dxy.x, dxy.y), dxy.z);
material.specularRoughness = min(material.specularRoughness, 1.0);

#ifdef REFLECTIVITY

	material.specularColor = mix( vec3( MAXIMUM_SPECULAR_COEFFICIENT * pow2( reflectivity ) ), diffuseColor.rgb, metalnessFactor );

#else

	material.specularColor = mix( vec3( DEFAULT_SPECULAR_COEFFICIENT ), diffuseColor.rgb, metalnessFactor );

#endif

#ifdef CLEARCOAT

	material.clearcoat = saturate( clearcoat ); // Burley clearcoat model
	material.clearcoatRoughness = clamp( clearcoatRoughness, 0.04, 1.0 );

#endif
#ifdef USE_SHEEN

	material.sheenColor = sheen;

#endif
`;
