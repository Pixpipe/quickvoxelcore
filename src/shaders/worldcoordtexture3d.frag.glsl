precision highp float;
precision highp sampler3D;


varying vec3 vPositionW;

uniform int blendMethod;
// must be in [0, 1].
// if closer to 0, the primary volume is more visible
// if closer to 1, the secondary volume is more visible
uniform float vol_0_vol_1_blendRatio;

// the primary 3D texture
uniform sampler3D vol_0_texture3D;
// the affine transformation matrix for the primary 3D texture
uniform mat4 vol_0_transfoMat;
// says if the primary 3D texture is ready
uniform int vol_0_textureReady;
// once it's ready, do we wish to display the primary volume?
uniform int vol_0_display;
// the current time position within the primary 3D texture
uniform int vol_0_timeVal;
// the number of time position available in the primary 3D texture
uniform int vol_0_timeSize;
// colormap used for the primary 3D texture
uniform sampler2D vol_0_colormap;
// Boolean of flipping or not the colormap of the primary 3D texture
uniform int vol_0_colormapFlip;
// Float value that represent the brightness of the primary volume
uniform float vol_0_brightness;
// Float value that represent the contrast of the primary volume
uniform float vol_0_contrast;


// the secondary 3D texture
uniform sampler3D vol_1_texture3D;
// the affine transformation matrix for the secondary 3D texture
uniform mat4 vol_1_transfoMat;
// says if the secondary 3D texture is ready
uniform int vol_1_textureReady;
// once it's ready, do we wish to display the secondary volume?
uniform int vol_1_display;
// the current time position within the secondary 3D texture
uniform int vol_1_timeVal;
// the number of time position available in the secondary 3D texture
uniform int vol_1_timeSize;
// colormap used for the primary 3D texture
uniform sampler2D vol_1_colormap;
// Boolean of flipping or not the colormap of the primary 3D texture
uniform int vol_1_colormapFlip;
// Float value that represent the brightness of the secondary volume
uniform float vol_1_brightness;
// Float value that represent the contrast of the secondary volume
uniform float vol_1_contrast;



// Get the color from the texture 0 (at the current worl coord).
// The out argument shouldDisplay will be 0 if this world coord is outside of
// the volume range and 1 if inside. To be used to know wether of not to use the
// returned color.
vec4 getColorVol_0( out int shouldDisplay, out float intensity){
  if( vol_0_textureReady == 0 || vol_0_display == 0){
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
    intensity = texture( vol_0_texture3D, unitPositionV3 ).r;

    // adding the contrast and brightness
    float intensityCB = vol_0_contrast * (intensity - 0.5) + 0.5 + vol_0_brightness;

    float positionOnColormap = (vol_0_colormapFlip == 0) ? intensityCB : (1. - intensityCB);
    vec4 color = texture( vol_0_colormap, vec2(positionOnColormap, 0.5) );
    return color;
  }
}


// Get the color from the texture 0 (at the current worl coord).
// The out argument shouldDisplay will be 0 if this world coord is outside of
// the volume range and 1 if inside. To be used to know wether of not to use the
// returned color.
vec4 getColorVol_1( out int shouldDisplay, out float intensity ){
  if( vol_1_textureReady == 0 || vol_1_display == 0){
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
    intensity = texture( vol_1_texture3D, unitPositionV3 ).r;

    // adding the contrast and brightness
    float intensityCB = vol_1_contrast * (intensity - 0.5) + 0.5 + vol_1_brightness;

    float positionOnColormap = (vol_1_colormapFlip == 0) ? intensityCB : (1. - intensityCB);
    vec4 color = texture( vol_1_colormap, vec2(positionOnColormap, 0.5) );
    return color;
  }
}


// Blend two colors using different methods.
vec4 blend( vec4 color0, vec4 color1, float intensity0, float intensity1, int method){
  vec4 color = vec4(0., 0., 0., 0.);

  switch( method ){

    // ratio
    case 0:
    color = color0 * (1. - vol_0_vol_1_blendRatio) + (color1 * vol_0_vol_1_blendRatio);
    break;


    // adding weighted
    case 1:
    color = color0 + color1*vol_0_vol_1_blendRatio;
    break;


    // multiply
    case 2:
    color = color0 * color1;

    default:
    break;
  }

  return color;
}



void main(void) {
  vec4 colorToDisplay = vec4(0., 0., 0., 0.);

  int displayColorVol_0 = 0;
  float intensityVol_0 = 0.;
  vec4 colorVol_0 = getColorVol_0( displayColorVol_0, intensityVol_0);

  int displayColorVol_1 = 0;
  float intensityVol_1 = 0.;
  vec4 colorVol_1 = getColorVol_1( displayColorVol_1, intensityVol_1 );

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
    colorToDisplay = blend( colorVol_0, colorVol_1, intensityVol_0, intensityVol_1, blendMethod);
  }

  gl_FragColor = colorToDisplay;
}
