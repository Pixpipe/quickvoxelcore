precision highp float;
precision highp sampler3D;


varying vec3 vPositionW;

uniform int blendMethod;

// the primary 3D texture
uniform sampler3D vol_0_texture3D;
// the affine transformation matrix for the primary 3D texture
uniform mat4 vol_0_transfoMat;
// says if the primary 3D texture is ready
uniform int vol_0_textureReady;
// the current time position within the primary 3D texture
uniform int vol_0_timeVal;
// the number of time position available in the primary 3D texture
uniform int vol_0_timeSize;



// the secondary 3D texture
uniform sampler3D vol_1_texture3D;
// the affine transformation matrix for the secondary 3D texture
uniform mat4 vol_1_transfoMat;
// says if the secondary 3D texture is ready
uniform int vol_1_textureReady;
// the current time position within the secondary 3D texture
uniform int vol_1_timeVal;
// the number of time position available in the secondary 3D texture
uniform int vol_1_timeSize;


// Get the color from the texture 0 (at the current worl coord).
// The out argument shouldDisplay will be 0 if this world coord is outside of
// the volume range and 1 if inside. To be used to know wether of not to use the
// returned color.
vec4 getColorVol_0( out int shouldDisplay ){
  if( vol_0_textureReady == 0 ){
    shouldDisplay = 0;
    return vec4(0., 0., 0., 0.);
  }

  vec4 v4PositionW = vec4( vPositionW, 1.0 );
  vec4 unitPositionV4 = v4PositionW * vol_0_transfoMat;
  vec3 unitPositionV3 = vec3( unitPositionV4.x  , unitPositionV4.y, (unitPositionV4.z + float(vol_0_timeVal))/ float(vol_0_timeSize) ) ;

  if( unitPositionV3.x < 0. || unitPositionV3.x > 1. ||
      unitPositionV3.y < 0. || unitPositionV3.y > 1. ||
      unitPositionV3.z < (float(vol_0_timeVal)/ float(vol_0_timeSize)) || unitPositionV3.z > ((1. + float(vol_0_timeVal))/ float(vol_0_timeSize)) )
  {
    shouldDisplay = 0;
    return vec4(0., 0., 0., 0.);
  }else{
    shouldDisplay = 1;
    vec4 color = texture( vol_0_texture3D, unitPositionV3 );
    color.g = color.r;
    color.b = color.r;
    return color;
  }
}


// Get the color from the texture 0 (at the current worl coord).
// The out argument shouldDisplay will be 0 if this world coord is outside of
// the volume range and 1 if inside. To be used to know wether of not to use the
// returned color.
vec4 getColorVol_1( out int shouldDisplay ){
  if( vol_1_textureReady == 0 ){
    shouldDisplay = 0;
    return vec4(0., 0., 0., 0.);
  }

  vec4 v4PositionW = vec4( vPositionW, 1.0 );
  vec4 unitPositionV4 = v4PositionW * vol_1_transfoMat;
  vec3 unitPositionV3 = vec3( unitPositionV4.x  , unitPositionV4.y, (unitPositionV4.z + float(vol_1_timeVal))/ float(vol_1_timeSize) ) ;

  if( unitPositionV3.x < 0. || unitPositionV3.x > 1. ||
      unitPositionV3.y < 0. || unitPositionV3.y > 1. ||
      unitPositionV3.z < (float(vol_1_timeVal)/ float(vol_1_timeSize)) || unitPositionV3.z > ((1. + float(vol_1_timeVal))/ float(vol_1_timeSize)) )
  {
    shouldDisplay = 0;
    return vec4(0., 0., 0., 0.);
  }else{
    shouldDisplay = 1;
    vec4 color = texture( vol_1_texture3D, unitPositionV3 );
    color.g = color.r;
    color.b = color.r;
    return color;
  }
}


// Blend two colors using different methods.
// Methods:
//   0: max. takes the max value for each component
//   1: avg. takes the average value for each component
vec4 blend( vec4 color0, vec4 color1, int method){
  vec4 color = vec4(0., 0., 0., 0.);

  switch( method ){

    // max
    case 0:
    color.r = max(color0.r, color1.r);
    color.g = max(color0.g, color1.g);
    color.b = max(color0.b, color1.b);
    color.a = max(color0.a, color1.a);
    break;

    // avg
    case 1:
    color.r = (color0.r + color1.r) / 2.;
    color.g = (color0.g + color1.g) / 2.;
    color.b = (color0.b + color1.b) / 2.;
    color.a = (color0.a + color1.a) / 2.;
    break;

    // 0: red , 1: green
    case 2:
    color.r = color0.r * 2.;
    color.g = color1.g;
    color.b = 0.;
    color.a = 1.;
    break;

    default:
    break;
  }

  return color;
}



void main(void) {
  vec4 colorToDisplay = vec4(0., 0., 0., 0.);

  int displayColorVol_0 = 0;
  vec4 colorVol_0 = getColorVol_0( displayColorVol_0 );

  int displayColorVol_1 = 0;
  vec4 colorVol_1 = getColorVol_1( displayColorVol_1 );

  // None of the textures can display
  if( displayColorVol_0 == 0  && displayColorVol_1 == 0 ){
    discard;
    return;
  }

  // only the texture 0 can display
  if( displayColorVol_0 == 1  && displayColorVol_1 == 0 ){
    colorToDisplay = colorVol_0;

  // only the texture 1 can display
  }else if( displayColorVol_0 == 0  && displayColorVol_1 == 1 ){
    colorToDisplay = colorVol_1;
  }

  // both texture can display
  else{
    colorToDisplay = blend( colorVol_0, colorVol_1, blendMethod);
  }

  gl_FragColor = colorToDisplay;
}
