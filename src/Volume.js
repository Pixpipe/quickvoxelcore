import * as BABYLON from 'babylonjs/es6.js'

/**
 * A Volume instance is a volumetric representation of some data that can be queried, displayed and identified.
 * - To be queried, a Volume embeds a `pixpipe.Image3DAlt`
 * - To be displayed, a Volume generates a WebGL 3D texture from the `pixpipe.Image3DAlt`
 * - To be identified, a Volume instance has an id, unique in the `VolumeCollection`
 *
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
   * @private
   * Compute the affine transformation matrix to go from world coord to unit texture
   */
  _computeV2Tmatrices(){
    let img3D = this._image3D
    let centerVoxel = img3D.getPositionWorldToVoxel({x:0, y:0, z:0}, false)

    let pixpipe_w2vSwappedMatrix = img3D.getW2VMatrixSwapped()

    let w2v = BABYLON.Matrix.FromArray( pixpipe_w2vSwappedMatrix ).transpose()

    // flipping the x axis is necessary because conventions are different between
    // WebGL and Pixpipe
    let flipX = new BABYLON.Matrix.FromValues(
      -1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    )

    let scalingMat = new BABYLON.Matrix.FromValues(
      1/img3D.getDimensionSize("x"), 0,  0,  0,
      0,  1/img3D.getDimensionSize("y"), 0,  0,
      0,  0,  1/img3D.getDimensionSize("z"), 0,
      0,  0,  0,  1
    )

    // the texture must be addressed as [k, j, i], which is the opposite of how
    // Pixpipe does, so we just reverse the dimensionality in the transform
    let reverseDimensionality = new BABYLON.Matrix.FromValues(
      0, 0, 1, 0,
      0, 1, 0, 0,
      1, 0, 0, 0,
      0, 0, 0, 1
    )

    let w2v_scaled = w2v.multiply( scalingMat )

    // the X (left to right) axis is fliped, so we unflip it
    let w2v_scaled_flipedX = w2v_scaled.multiply(flipX); // ok

    // with JUST reverseDimensionality
    let transfoMat = reverseDimensionality.multiply( w2v_scaled_flipedX )

    // putting the center at the center
    transfoMat.m[3] = centerVoxel.k / img3D.getDimensionSize("k")
    transfoMat.m[7] = centerVoxel.j / img3D.getDimensionSize("j")
    transfoMat.m[11] =  centerVoxel.i / img3D.getDimensionSize("i")

    this._transfoMatrices.v2t = transfoMat;

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
      //BABYLON.Texture.NEAREST_SAMPLINGMODE
      BABYLON.Texture.TRILINEAR_SAMPLINGMODE
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


  /**
   * Get the voxel value at the given world position.
   * Note: the world coordinates are floating point and this method perform a lookup
   * in voxel coordinates in the `pixpipe.Image3DAlt` data. Voxel coordinates being integer,
   * no interpolation from worl to voxel is performed by this method.
   * This just gives the value of the closest voxel.
   * @param  {Object} [position={x:0, y:0, z:0}] - position in world coordinates
   * @param  {Number} [time=0] - time index (makes sense only for time series)
   * @return {Number} the voxel intensity
   */
  getValue (position={x:0, y:0, z:0}, time=0) {
    return this._image3D.getVoxelTransfoSpace( "w2v", position, time )
  }


}

export { Volume }
