uniform sampler2D tInput;
uniform float amount;
uniform float speed;
uniform float time;
varying vec2 vUv;

float random(vec2 n, float offset ){
	//return fract(sin(dot(gl_FragCoord.xyz+seed,scale))*43758.5453);
	return .5 - fract(sin(dot(n.xy + vec2( offset, 0. ), vec2(12.9898, 78.233)))* 43758.5453);
}

void main() {

	vec4 color = texture2D(tInput, vUv);

	//color += amount * ( .5 - random( vec3( 1. ), length( gl_FragCoord ) + speed * .01 * time ) );
	color += vec4( vec3( amount * random( vUv, .00001 * speed * time ) ), 1. );

	gl_FragColor = color;

}