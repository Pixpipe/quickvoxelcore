precision highp float;
precision highp sampler3D;

uniform mat4 transfoMat;
varying vec3 vPositionW;

uniform sampler3D texture3D;
uniform int textureReady;

// the current time position
uniform int timeVal;
// the number of time position available
uniform int timeSize;

void main(void) {
  if( textureReady == 0 ){
    discard;
    return;
  }

  vec4 v4PositionW = vec4( vPositionW, 1.0 );
  vec4 unitPositionV4 = v4PositionW * transfoMat;

  vec3 unitPositionV3 = vec3( unitPositionV4.x  , unitPositionV4.y, (unitPositionV4.z + float(timeVal))/ float(timeSize) ) ;

  if( unitPositionV3.x < 0. || unitPositionV3.x > 1. ||
      unitPositionV3.y < 0. || unitPositionV3.y > 1. ||
      unitPositionV3.z < (float(timeVal)/ float(timeSize)) || unitPositionV3.z > ((1. + float(timeVal))/ float(timeSize)) )
  {
    discard;
    return;
  }

  vec4 textureColor = texture( texture3D, unitPositionV3 );

  // to prevent Firefox displaying it only red
  // (maybe there is a hardcoded _RED texture thing in BJS)
  textureColor.r = textureColor.r;
  textureColor.g = textureColor.r;
  textureColor.b = textureColor.r;

  gl_FragColor = textureColor;
}
