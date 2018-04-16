import * as BABYLON from 'babylonjs/es6.js'

/**
 * [Volume description]
 */
class Volume {
  /**
   * [constructor description]
   */
  constructor (id, image3D) {
    this._id = id
    this._image3D = image3D
    this._texture3D = null

    this._transfoMatrices = {
      v2t: null,            // from v to world, the center is based on world offset
      v2t_center: null      // fallback if the offset are corrupted. The center becomes the center of the volume
    }

    this._computeV2Tmatrices();
  }


  /**
   * Compute the affine transformation matrices that are necessary for a propper
   * world coordinates display
   * @return {[type]} [description]
   */
  _computeV2Tmatrices(){
    let img3D = this._image3D
    // matrices in Pixpipe are inherited from glMatrix, thus are column major
    let pixpipe_SwapMat = img3D.getVoxelCoordinatesSwapMatrix( false, true );
    let pixpipe_V2W = img3D.getTransformMatrix('v2w') ;

    // whereas the matrices in babylonjs are row major
    let swapMatrix = BABYLON.Matrix.FromArray( pixpipe_SwapMat ).transpose();
    let v2w = BABYLON.Matrix.FromArray( pixpipe_V2W ).transpose();

    // the purpose of the scaling mat is to switch from unit texture dimensions
    // to world dimensions
    let scalingMat = new BABYLON.Matrix.FromValues(
      img3D.getDimensionSize("x"), 0, 0, 1,
      0, img3D.getDimensionSize("y"), 0, 1,
      0, 0, img3D.getDimensionSize("z"), 1,
      0, 0, 0, 1
    )

    // for whatever reason, MNI space is flipped on X compared to WebGL.
    // No big deal, it's probably just texture indexing convention.
    let flipper = new BABYLON.Matrix.FromValues(
      -1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    )

    // the swapMatrix is identity 99% of the time. Still, sometimes a NIfTI file
    // is badly encoded and does not respect the NIfTI spec
    scalingMat = scalingMat.multiply( swapMatrix );

    let transfoMat = v2w.multiply( scalingMat );
    this._transfoMatrices.v2t = BABYLON.Matrix.Invert( transfoMat ).multiply( flipper );

    // sometimes, one of the offset (or more) is zero, which makes no
    // sens in this brain context (weither it's Talairach or MNI space).
    // Then, we arbitrarily set the origin at the center of the volume.
    // In this case, the world origin is no longer valid but we still
    // keep relative size ok.
    this._transfoMatrices.v2t_center = this._transfoMatrices.v2t.clone();
    this._transfoMatrices.v2t_center.m[3] = 0.5;
    this._transfoMatrices.v2t_center.m[7] = 0.5;
    this._transfoMatrices.v2t_center.m[11] = 0.5;
  }


  /**
   * Build the texture corresponding to this volume. This requires a scene instance
   * @param  {[type]} bjsScene [description]
   * @return {[type]}          [description]
   */
  buildTexture( bjsScene ){
    let dimK = this._image3D.getDimensionSize("k");
    let dimJ = this._image3D.getDimensionSize("j");
    let dimI = this._image3D.getDimensionSize("i");
    let dimT = this._image3D.getTimeLength();

    this._texture3D = new BABYLON.RawTexture3D(
      this._image3D.getDataUint8(),
      dimK ,
      dimJ ,
      dimI * dimT,
      BABYLON.Engine.TEXTUREFORMAT_LUMINANCE,
      bjsScene,
      false, // generate mipmaps
      false, // invertY
      BABYLON.Texture.NEAREST_SAMPLINGMODE
      //BABYLON.Texture.TRILINEAR_SAMPLINGMODE
    )
  }


  /**
   * Get the id of this volume
   * @return {String} the id
   */
  getId () {
    return this._id;
  }


  /**
   * get the babylonjs texture3d object
   * @return {BABYLON.RawTexture3D} the texture corresponding to this volume
   */
  getTexture3D () {
    return this._texture3D;
  }


  /**
   * Get the Pixpipe Image3DAlt object
   * @return {pixpipe.Image3DAlt} The volume data as loaded by Pixpipe
   */
  getImage3D () {
    return this._image3D;
  }


  /**
   * Get the transformation matrix with the given name
   * @param  {String} name - name of the transform (most likely "v2t" or "v2t_center")
   * @return {BABYLON.Matrix} the matrix
   */
  getMatrix (name) {
    if (name in this._transfoMatrices) {
      return this._transfoMatrices[name]
    }else{
      return null;
    }
  }


  /**
   * Get a list of all available matrices for this volume, as strings
   * @return {Array}
   */
  getAvaialableMatrices () {
    return Object.keys( this._transfoMatrices )
  }


  /**
   * Get the number of time samples. fMRI (or diffusion) will have more than one
   * while structural MRI will usually have only one.
   * @return {Number}
   */
  getTimeLength () {
    return this._image3D.getTimeLength()
  }



}

export { Volume }
