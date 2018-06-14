uniform sampler2D tInput;
uniform vec2 resolution;
varying vec2 vUv;

#define FXAA_REDUCE_MIN   (1.0/128.0)
#define FXAA_REDUCE_MUL   (1.0/8.0)
#define FXAA_SPAN_MAX     8.0

void main() {

    vec2 res = 1. / resolution;

    vec3 rgbNW = texture2D( tInput, ( vUv.xy + vec2( -1.0, -1.0 ) * res ) ).xyz;
    vec3 rgbNE = texture2D( tInput, ( vUv.xy + vec2( 1.0, -1.0 ) * res ) ).xyz;
    vec3 rgbSW = texture2D( tInput, ( vUv.xy + vec2( -1.0, 1.0 ) * res ) ).xyz;
    vec3 rgbSE = texture2D( tInput, ( vUv.xy + vec2( 1.0, 1.0 ) * res ) ).xyz;
    vec4 rgbaM  = texture2D( tInput,  vUv.xy  * res );
    vec3 rgbM  = rgbaM.xyz;
    vec3 luma = vec3( 0.299, 0.587, 0.114 );

    float lumaNW = dot( rgbNW, luma );
    float lumaNE = dot( rgbNE, luma );
    float lumaSW = dot( rgbSW, luma );
    float lumaSE = dot( rgbSE, luma );
    float lumaM  = dot( rgbM,  luma );
    float lumaMin = min( lumaM, min( min( lumaNW, lumaNE ), min( lumaSW, lumaSE ) ) );
    float lumaMax = max( lumaM, max( max( lumaNW, lumaNE) , max( lumaSW, lumaSE ) ) );

    vec2 dir;
    dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));
    dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));

    float dirReduce = max( ( lumaNW + lumaNE + lumaSW + lumaSE ) * ( 0.25 * FXAA_REDUCE_MUL ), FXAA_REDUCE_MIN );

    float rcpDirMin = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + dirReduce );
    dir = min( vec2( FXAA_SPAN_MAX,  FXAA_SPAN_MAX),
          max( vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),
                dir * rcpDirMin)) * res;
    vec4 rgbA = (1.0/2.0) * (
    texture2D(tInput,  vUv.xy + dir * (1.0/3.0 - 0.5)) +
    texture2D(tInput,  vUv.xy + dir * (2.0/3.0 - 0.5)));
    vec4 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (
    texture2D(tInput,  vUv.xy + dir * (0.0/3.0 - 0.5)) +
    texture2D(tInput,  vUv.xy + dir * (3.0/3.0 - 0.5)));
    float lumaB = dot(rgbB, vec4(luma, 0.0));

    if ( ( lumaB < lumaMin ) || ( lumaB > lumaMax ) ) {
        gl_FragColor = rgbA;
    } else {
        gl_FragColor = rgbB;
    }

    //gl_FragColor = vec4( texture2D( tInput,vUv ).xyz, 1. );
}