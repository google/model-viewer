/**
 * @license MIT
 * @see https://github.com/mrdoob/three.js/blob/dev/LICENSE
 */

export const alphaChunk = /* glsl */ `
#ifdef ALPHATEST

    if ( diffuseColor.a < ALPHATEST ) discard;
    diffuseColor.a = 1.0;

#endif
`;
