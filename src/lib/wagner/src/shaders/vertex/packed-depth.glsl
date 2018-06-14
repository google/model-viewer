varying float depth;
varying vec2 vUv;

uniform float mNear;
uniform float mFar;

void main() {

  vec4 viewPos = vec4( modelViewMatrix * vec4( position, 1.0 ) ); // this will transform the vertex into eyespace
    depth = 1. - ( mNear + viewPos.z ) / ( mNear - mFar );

  vec3 vPosition = vec4( modelViewMatrix * vec4( position, 1.0 ) ).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

	vUv = uv;

  depth = -viewPos.z;

  depth = (-viewPos.z-mNear)/(mFar-mNear); // will map near..far to 0..1

}