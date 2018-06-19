uniform sampler2D tInput;
uniform vec2 center;
uniform float strength;
uniform vec2 resolution;
varying vec2 vUv;

float random(vec3 scale,float seed){return fract(sin(dot(gl_FragCoord.xyz+seed,scale))*43758.5453+seed);}

void main(){
  vec4 color=vec4(0.0);
  float total=0.0;
  vec2 toCenter=center-vUv*resolution;
  float offset=random(vec3(12.9898,78.233,151.7182),0.0);
  for(float t=0.0;t<=40.0;t++){
    float percent=(t+offset)/40.0;
    float weight=4.0*(percent-percent*percent);
    vec4 sample=texture2D(tInput,vUv+toCenter*percent*strength/resolution);
    sample.rgb*=sample.a;
    color+=sample*weight;
    total+=weight;
  }
  gl_FragColor=color/total;
  gl_FragColor.rgb/=gl_FragColor.a+0.00001;
}