varying vec2 vUv;
uniform sampler2D tInput;
uniform vec2 resolution;

uniform float reduction;
uniform float boost;

void main() {

  vec4 color = texture2D( tInput, vUv );

  vec2 center = resolution * 0.5;
  float vignette = distance( center, gl_FragCoord.xy ) / resolution.x;
  vignette = boost - vignette * reduction;

  color.rgb *= vignette;
  gl_FragColor = color;

}