varying vec2 vUv;
uniform sampler2D tDepth;
uniform vec2 resolution;
uniform float isPacked;
uniform float onlyOcclusion;


float occlusion;
float depth;
float ac;

float random(vec3 scale,float seed){return fract(sin(dot(gl_FragCoord.xyz+seed,scale))*43758.5453+seed);}

float unpack_depth(const in vec4 color) {
  return ( color.r * 256. * 256. * 256. + color.g * 256. * 256. + color.b * 256. + color.a ) / ( 256. * 256. * 256. );
}

float sampleDepth( vec2 uv ) {
  if( isPacked == 1. ) {
    return unpack_depth( texture2D( tDepth, uv ) );
  } else {
    return texture2D( tDepth, uv ).r;
  }
}



void checkDepth( vec2 uv ) { // from iq's tutorial
  float zd = 10.0 * min( depth - sampleDepth( uv ), 0.0 );
  ac += zd;
    occlusion += 1.0 / ( 1. + zd * zd );
}

void main() {

  occlusion = 0.;
  depth = sampleDepth( vUv );
  ac = 0.;
  
  float r = 4.;
  float xi = r / resolution.x;
  float yi = r / resolution.y;

  checkDepth( vUv + vec2( - 2. * xi, - 2. * yi ) );
  checkDepth( vUv + vec2(      - xi, - 2. * yi ) );
  checkDepth( vUv + vec2(        0., - 2. * yi ) );
  checkDepth( vUv + vec2(        xi, - 2. * yi ) );
  checkDepth( vUv + vec2(   2. * xi, - 2. * yi ) );

  checkDepth( vUv + vec2( - 2. * xi, - yi ) );
  checkDepth( vUv + vec2(      - xi, - yi ) );
  checkDepth( vUv + vec2(        0., - yi ) );
  checkDepth( vUv + vec2(        xi, - yi ) );
  checkDepth( vUv + vec2(   2. * xi, - yi ) );

  checkDepth( vUv + vec2( - 2. * xi, 0. ) );
  checkDepth( vUv + vec2(      - xi, 0. ) );
  checkDepth( vUv + vec2(        xi, 0. ) );
  checkDepth( vUv + vec2(   2. * xi, 0. ) );

  checkDepth( vUv + vec2( - 2. * xi, yi ) );
  checkDepth( vUv + vec2(      - xi, yi ) );
  checkDepth( vUv + vec2(        0., yi ) );
  checkDepth( vUv + vec2(        xi, yi ) );
  checkDepth( vUv + vec2(   2. * xi, yi ) );

  checkDepth( vUv + vec2( - 2. * xi, 2. * yi ) );
  checkDepth( vUv + vec2(      - xi, 2. * yi ) );
  checkDepth( vUv + vec2(        0., 2. * yi ) );
  checkDepth( vUv + vec2(        xi, 2. * yi ) );
  checkDepth( vUv + vec2(   2. * xi, 2. * yi ) );

  occlusion /= 24.;
  occlusion += .02 * random( vec3( gl_FragCoord.xy, depth ), length( gl_FragCoord ) );

  /*if( onlyOcclusion == 1. ) {
    gl_FragColor = vec4( vec3( occlusion ), 1. );
  } else {
    vec3 color = texture2D( tInput, vUv ).rgb;
    color = mix( vec3( 0. ), color, occlusion );
    gl_FragColor = vec4( color, 1. );
  }*/


  float inBlack = 0.;
  float inWhite = 255.;
  float inGamma = 10.;
  float outBlack = 0.;
  float outWhite = 255.;

  //occlusion = ( pow( ( ( occlusion * 255.0) - inBlack) / (inWhite - inBlack), inGamma) * (outWhite - outBlack) + outBlack) / 255.0;

  gl_FragColor = vec4( vec3( occlusion ), 1. );

}