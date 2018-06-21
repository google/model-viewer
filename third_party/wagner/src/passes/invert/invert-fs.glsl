varying vec2 vUv;
uniform sampler2D tInput;

void main() {

	gl_FragColor = texture2D( tInput, vUv );
	gl_FragColor.rgb = 1. - gl_FragColor.rgb;

}