varying vec2 vUv;
uniform sampler2D tInput;
uniform vec2 resolution;
uniform float amount;

void main() {

	float d = 1.0 / amount;
	float ar = resolution.x / resolution.y;
	float u = floor( vUv.x / d ) * d;
	d = ar / amount;
	float v = floor( vUv.y / d ) * d;
	gl_FragColor = texture2D( tInput, vec2( u, v ) );

}