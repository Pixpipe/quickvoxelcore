precision highp float;

// Attributes
attribute vec3 position;

// Uniforms
uniform mat4 world;
uniform mat4 worldViewProjection;

// Varying
varying vec3 vPositionW;

void main(void) {
  vec4 outPosition = worldViewProjection * vec4(position, 1.0);
  gl_Position = outPosition;

  vPositionW = vec3(world * vec4(position, 1.0));
}
