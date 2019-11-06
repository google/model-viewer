/**
 * @license MIT
 * @see https://github.com/mrdoob/three.js/blob/dev/LICENSE
 */

export const lightsChunk = /* glsl */ `
PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );

vec3 dxy = max(abs(dFdx(geometryNormal)), abs(dFdy(geometryNormal)));
float sigma = max(max(dxy.x, dxy.y), dxy.z);
float normalVariance = sigma * sigma + roughness2variance(roughnessFactor);

material.specularRoughness = clamp( variance2roughness(normalVariance), 0.04, 1.0 );

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