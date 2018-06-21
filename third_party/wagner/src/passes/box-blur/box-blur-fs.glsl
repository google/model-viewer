varying vec2 vUv;
uniform sampler2D tInput;
uniform vec2 delta;
uniform vec2 resolution;

void main() {

  vec4 sum = vec4( 0. );
  vec2 inc = delta / resolution;

  sum += texture2D( tInput, ( vUv - inc * 4. ) ) * 0.051;
  sum += texture2D( tInput, ( vUv - inc * 3. ) ) * 0.0918;
  sum += texture2D( tInput, ( vUv - inc * 2. ) ) * 0.12245;
  sum += texture2D( tInput, ( vUv - inc * 1. ) ) * 0.1531;
  sum += texture2D( tInput, ( vUv + inc * 0. ) ) * 0.1633;
  sum += texture2D( tInput, ( vUv + inc * 1. ) ) * 0.1531;
  sum += texture2D( tInput, ( vUv + inc * 2. ) ) * 0.12245;
  sum += texture2D( tInput, ( vUv + inc * 3. ) ) * 0.0918;
  sum += texture2D( tInput, ( vUv + inc * 4. ) ) * 0.051;

  gl_FragColor = sum;

}