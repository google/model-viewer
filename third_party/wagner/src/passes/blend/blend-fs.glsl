varying vec2 vUv;
uniform sampler2D tInput;
uniform sampler2D tInput2;
uniform vec2 resolution;
uniform vec2 resolution2;
uniform float aspectRatio;
uniform float aspectRatio2;
uniform int mode;
uniform int sizeMode;
uniform float opacity;

vec2 vUv2;

float applyOverlayToChannel( float base, float blend ) {

  return (base < 0.5 ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend)));

}

float applySoftLightToChannel( float base, float blend ) {

  return ((blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend)));

}

float applyColorBurnToChannel( float base, float blend ) {

  return ((blend == 0.0) ? blend : max((1.0 - ((1.0 - base) / blend)), 0.0));

}

float applyColorDodgeToChannel( float base, float blend ) {

  return ((blend == 1.0) ? blend : min(base / (1.0 - blend), 1.0));

}

float applyLinearBurnToChannel( float base, float blend ) {

  return max(base + blend - 1., 0.0 );

}

float applyLinearDodgeToChannel( float base, float blend ) {

  return min( base + blend, 1. );

}

float applyLinearLightToChannel( float base, float blend ) {

  return ( blend < .5 ) ? applyLinearBurnToChannel( base, 2. * blend ) : applyLinearDodgeToChannel( base, 2. * ( blend - .5 ) );

}

void main() {

  vUv2 = vUv;
  
  if( sizeMode == 1 ) {
    
    if( aspectRatio2 > aspectRatio ) {
      vUv2.x = vUv.x * aspectRatio / aspectRatio2;
      vUv2.x += .5 * ( 1. - aspectRatio / aspectRatio2 ); 
      vUv2.y = vUv.y;
    }

    if( aspectRatio2 < aspectRatio ) {
      vUv2.x = vUv.x;
      vUv2.y = vUv.y * aspectRatio2 / aspectRatio;
      vUv2.y += .5 * ( 1. - aspectRatio2 / aspectRatio );
    }

  }

  vec4 base = texture2D( tInput, vUv );
  vec4 blend = texture2D( tInput2, vUv2 );

  if( mode == 1 ) { // normal

    gl_FragColor = base;
    gl_FragColor.a *= opacity;
    return;

  }

  if( mode == 2 ) { // dissolve

  }

  if( mode == 3 ) { // darken

    gl_FragColor = min( base, blend );
    return;

  }

  if( mode == 4 ) { // multiply

    gl_FragColor = base * blend;
    return;

  }

  if( mode == 5 ) { // color burn

    gl_FragColor = vec4(
      applyColorBurnToChannel( base.r, blend.r ),
      applyColorBurnToChannel( base.g, blend.g ),
      applyColorBurnToChannel( base.b, blend.b ),
      applyColorBurnToChannel( base.a, blend.a )
    );
    return;

  }

  if( mode == 6 ) { // linear burn

    gl_FragColor = max(base + blend - 1.0, 0.0);
    return;

  }

  if( mode == 7 ) { // darker color

  }

  if( mode == 8 ) { // lighten

    gl_FragColor = max( base, blend );
    return;

  }

  if( mode == 9 ) { // screen

    gl_FragColor = (1.0 - ((1.0 - base) * (1.0 - blend)));
    gl_FragColor = gl_FragColor * opacity + base * ( 1. - opacity );
    return;

  }

  if( mode == 10 ) { // color dodge

    gl_FragColor = vec4(
      applyColorDodgeToChannel( base.r, blend.r ),
      applyColorDodgeToChannel( base.g, blend.g ),
      applyColorDodgeToChannel( base.b, blend.b ),
      applyColorDodgeToChannel( base.a, blend.a )
    );
    return;

  }

  if( mode == 11 ) { // linear dodge

    gl_FragColor = min(base + blend, 1.0);
    return;

  }

  if( mode == 12 ) { // lighter color

  }

  if( mode == 13 ) { // overlay

    gl_FragColor = gl_FragColor = vec4( 
      applyOverlayToChannel( base.r, blend.r ),
      applyOverlayToChannel( base.g, blend.g ),
      applyOverlayToChannel( base.b, blend.b ),
      applyOverlayToChannel( base.a, blend.a )
    );
    gl_FragColor = gl_FragColor * opacity + base * ( 1. - opacity );
  
    return;

  }

  if( mode == 14 ) { // soft light

    gl_FragColor = vec4( 
      applySoftLightToChannel( base.r, blend.r ),
      applySoftLightToChannel( base.g, blend.g ),
      applySoftLightToChannel( base.b, blend.b ),
      applySoftLightToChannel( base.a, blend.a )
    );
    return;

  }

  if( mode == 15 ) { // hard light

    gl_FragColor = vec4( 
      applyOverlayToChannel( base.r, blend.r ),
      applyOverlayToChannel( base.g, blend.g ),
      applyOverlayToChannel( base.b, blend.b ),
      applyOverlayToChannel( base.a, blend.a )
    );
    gl_FragColor = gl_FragColor * opacity + base * ( 1. - opacity );
    return;

  }

  if( mode == 16 ) { // vivid light

  }

  if( mode == 17 ) { // linear light

    gl_FragColor = vec4( 
      applyLinearLightToChannel( base.r, blend.r ),
      applyLinearLightToChannel( base.g, blend.g ),
      applyLinearLightToChannel( base.b, blend.b ),
      applyLinearLightToChannel( base.a, blend.a )
    );
    return;

  }

  if( mode == 18 ) { // pin light

  }

  if( mode == 19 ) { // hard mix

  }

  if( mode == 20 ) { // difference

    gl_FragColor = abs( base - blend );
    gl_FragColor.a = base.a + blend.b;
    return;

  }

  if( mode == 21 ) { // exclusion

    gl_FragColor = base + blend - 2. * base * blend;
    
  }

  if( mode == 22 ) { // substract

  }

  if( mode == 23 ) { // divide

  }

  gl_FragColor = vec4( 1., 0., 1., 1. );

}