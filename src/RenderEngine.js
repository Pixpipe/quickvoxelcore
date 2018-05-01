//import * as BABYLON from 'babylonjs/es6.js'
import {
  Effect as BJSEffect,
  Engine as BJSEngine,
  Scene as BJSScene,
  Color3 as BJSColor3,
  ArcRotateCamera as BJSArcRotateCamera,
  Vector3 as BJSVector3,
  RawTexture3D as BJSRawTexture3D,
  ShaderMaterial as BJSShaderMaterial,
  Matrix as BJSMatrix,
  Mesh as BJSMesh,
  Quaternion as BJSQuaternion,
  MeshBuilder as BJSMeshBuilder
} from 'babylonjs/es6.js'

import worldcoordtexture3dFrag from './shaders/worldcoordtexture3d.frag.glsl'
import worldcoordtexture3dVert from './shaders/worldcoordtexture3d.vert.glsl'
import { ColormapManager } from './ColormapManager.js'
import { CONSTANTS } from './constants.js'

/**
 * The RenderEngine is automatically initialized by the constructor of QuickVoxelCore.
 * The engine in in charge of the visualization part by initializing the WebGL environment,
 * sending data to shaders, and updating them. Once the QuickVoxelCore object is created,
 * the RenderEngine can be fetched to call methods from it directly.
 */
class RenderEngine {
  /**
   * constructor
   * @param {DomElement} canvasElem - a DOM object of a canvas
   */
  constructor ( canvasElem ) {
    let that = this
    BJSEffect.ShadersStore["worldCoordVolumeFragmentShader"] = worldcoordtexture3dFrag
    BJSEffect.ShadersStore["worldCoordVolumeVertexShader"] = worldcoordtexture3dVert

    this._canvas = canvasElem
    this._engine = new BJSEngine(this._canvas, true)
    this._scene = new BJSScene(this._engine)
    this._scene.clearColor = new BJSColor3(0.92, 0.92, 0.92)

    this._colormapManager = new ColormapManager( this._scene )

    this._emptyTexture3D = this._initEmpty3dTexture()
    this._shaderMaterial = this._initShaderMaterial()
    this._planeSystem = this._initOrthoPlaneSystem()

    this._events = {
      rotate: [],
      translate: [],
    }


    this._mountedVolumes = [
      null, // primary volume
      null  // secondary volume
    ]

    this._engine.runRenderLoop(function () {
      that._scene.render();
    });

    window.addEventListener("resize", function () {
      that._engine.resize();
    });
  }


  /**
   * Define the callback attached to an event
   * @param  {String} eventName - the name of the event, must exist in this._events (with the value null)
   * @param  {Function} callback - the function associated to this event
   */
  on (eventName, callback) {
    if( (typeof callback === "function") && (eventName in this._events) ){
      this._events[ eventName ].push( callback )
    }
  }


  /**
   * @private
   * Call an event by invoking its name and providing some arguments.
   * This methods should be used internally rather than using wild calls.
   * @param  {String} eventName - the name of the event, must exist in this._events (with the value null)
   * @param  {Array} args - array of arguments, to be spread when callback is called
   */
  _callEvent (eventName, args=[]) {
    // the event must exist and be non null
    if( (eventName in this._events) && (this._events[eventName].length>0) ){
      let events = this._events[ eventName ]
      for (let i=0; i<events.length; i++) {
        events[i](...args)
      }
    }
  }


  /**
   * @private
   * Initialize the default (main) camera. The main camera is a regular perspective cemera (aka. not ortho)
   */
  _initMainCamera () {
    let mainCam = new BJSArcRotateCamera("main", Math.PI / 2, Math.PI / 2, 2, BJSVector3.Zero(), this._scene);
    mainCam.inertia = 0.7;
    mainCam.setPosition( new BJSVector3(300, 0, 0) )
    mainCam.attachControl( this._canvas, true, true );
    mainCam.upperBetaLimit = null;
    mainCam.lowerBetaLimit = null;

    // remove the pole lock
    this._scene.registerBeforeRender(function(){
      if(mainCam.beta <= 0){
        mainCam.beta += Math.PI * 2;
      }
    });

    return mainCam;
  }

  /**
   * @private
   * Creates an empty texture so that the shader can be initialized with data
   * @return {[type]} [description]
   */
  _initEmpty3dTexture () {
    return new BJSRawTexture3D( new Uint8Array(1),1,1,1, BJSEngine.TEXTUREFORMAT_LUMINANCE, this._scene);
  }


  /**
   * @private
   * Initialize the shader material of the plane system
   * @return {[type]} [description]
   */
  _initShaderMaterial () {
    let shaderMaterial = new BJSShaderMaterial(
      'shad',
      this._scene,
      {
        vertexElement: "worldCoordVolume",
        fragmentElement: "worldCoordVolume"
      },
      {
        attributes: ["position", "normal", "uv"],
        uniforms: ["world", "worldView", "worldViewProjection", "blendMethod", "vol_0_vol_1_blendRatio",
          "vol_0_texture3D", "vol_0_transfoMat", "vol_0_timeVal", "vol_0_timeSize", "vol_0_textureReady", "vol_0_display",
          "vol_1_texture3D", "vol_1_transfoMat", "vol_1_timeVal", "vol_1_timeSize", "vol_1_textureReady", "vol_1_display"
        ]
      });

    // setting some default values
    shaderMaterial.setInt( "blendMethod", 0 )

    // must be in [0, 1].
    // if closer to 0, the primary volume is more visible
    // if closer to 1, the secondary volume is more visible
    shaderMaterial.setFloat( "vol_0_vol_1_blendRatio", 0.5 )

    this._initDefaultTexture( 0, shaderMaterial )
    this._initDefaultTexture( 1, shaderMaterial )

    return shaderMaterial;
  }


  /**
   * Change the blending method. Note that this matters only when 2 textures are displayed.
   * Available are:
   *   - `quickvoxelcore.CONSTANTS.BLENDING_METHODS.ratio`
   *   - `quickvoxelcore.CONSTANTS.BLENDING_METHODS.added-weighted`
   *   - `quickvoxelcore.CONSTANTS.BLENDING_METHODS.multiply` (default)
   * @param {String} m - method of blending
   */
  setBlendMethod (method) {
    if (method in CONSTANTS.BLENDING_METHODS) {
      this._shaderMaterial.setInt( 'blendMethod', CONSTANTS.BLENDING_METHODS[method] )
    } else {
      console.warn('The blending method ' + method + ' does not exist.');
    }
  }


  /**
   * Get the list of blending methods
   * @return {Array} the list of strings, names of the blending methods
   */
  getBlendMethodList () {
    return Object.keys( CONSTANTS.BLENDING_METHODS )
  }


  /**
   * @private
   * Initialize the texture data relative to a single texture
   * @param  {Number} n - 0 for primary, 1 for secondary
   * @param  {BABYLON.ShaderMaterial} shaderMaterial - the shader material to update
   */
  _initDefaultTexture (n, shaderMaterial) {
    shaderMaterial.setTexture( "vol_" + n + "_texture3D", this._emptyTexture3D )
    shaderMaterial.setMatrix( "vol_" + n + "_transfoMat", BJSMatrix.Identity() )
    shaderMaterial.setInt( "vol_" + n + "_timeVal", 0 )
    shaderMaterial.setInt( "vol_" + n + "_timeSize", 0 )
    shaderMaterial.setInt( "vol_" + n + "_textureReady", 0 )
    shaderMaterial.setInt( "vol_" + n + "_display", 1 )

    let defaultColormapTexture = this._colormapManager.getColormap()
    shaderMaterial.setTexture( "vol_" + n + "_colormap", defaultColormapTexture )
    shaderMaterial.setInt( "vol_" + n + "_colormapFlip", 0 )

    // brightness and contrast
    shaderMaterial.setFloat( "vol_" + n + "_brightness", 0. )
    shaderMaterial.setFloat( "vol_" + n + "_contrast", 1. )
  }


  /**
   * @private
   * Design a plane system composed of 3 orthogonal planes, each of them being 1000x1000
   * @return {[type]} [description]
   */
  _initOrthoPlaneSystem () {
    let orthoPlaneSystem = new BJSMesh( "orthoPlaneSystem", this._scene );
    orthoPlaneSystem.rotationQuaternion = BJSQuaternion.Identity()

    let xyPlane = BJSMeshBuilder.CreatePlane(
      "xy",
      {
        height:CONSTANTS.GEOMETRY.DEFAULT_PLANE_SIZE,
        width: CONSTANTS.GEOMETRY.DEFAULT_PLANE_SIZE,
        sideOrientation: BJSMesh.DOUBLESIDE
      }, this._scene);
    xyPlane.rotation.x = Math.PI; // just so that the first normal goes to the positive direction
    xyPlane.parent = orthoPlaneSystem;
    xyPlane.material = this._shaderMaterial
    xyPlane.computeWorldMatrix(true)

    let xzPlane = BJSMeshBuilder.CreatePlane(
      "xz",
      {
        height:CONSTANTS.GEOMETRY.DEFAULT_PLANE_SIZE,
        width: CONSTANTS.GEOMETRY.DEFAULT_PLANE_SIZE,
        sideOrientation: BJSMesh.DOUBLESIDE
      }, this._scene);
    xzPlane.rotation.x = Math.PI/2;
    xzPlane.parent = orthoPlaneSystem;
    xzPlane.material = this._shaderMaterial;
    xzPlane.computeWorldMatrix(true)

    let yzPlane = BJSMeshBuilder.CreatePlane(
      "yz",
      {
        height:CONSTANTS.GEOMETRY.DEFAULT_PLANE_SIZE,
        width: CONSTANTS.GEOMETRY.DEFAULT_PLANE_SIZE,
        sideOrientation: BJSMesh.DOUBLESIDE
      }, this._scene);
    yzPlane.rotation.y = -Math.PI/2;
    yzPlane.parent = orthoPlaneSystem;
    yzPlane.material = this._shaderMaterial;
    yzPlane.computeWorldMatrix(true)

    return orthoPlaneSystem;
  }


  /**
   * Set the position of a given camera, by its id
   * @param {String} cameraId - the id of the camera
   * @param {Object} position={x:100, y:100, z:100} - position of the camera
   */
  /*
  setCameraPosition ( cameraId, position={x:100, y:100, z:100}) {
    if( cameraId in this._cameras ){
      this._cameras[ cameraId ].setPosition( new BJSVector3(position.x, position.y, position.z) );
    }else{
      console.warn(`Camera with the id ${cameraId} does not exist`);
    }
  }
  */

  /**
   * Update the position of the center of the _planeSystem in world coordinates.
   * Not each position property have to be updated.
   * @param  {Object} [position={x:undefined, y:undefined, z:undefined}] - The new position
   */
  setPosition (position={x:undefined, y:undefined, z:undefined}) {
    if (position.x !== undefined) {
      this._planeSystem.position.x = position.x;
    }

    if (position.y !== undefined) {
      this._planeSystem.position.y = position.y;
    }

    if (position.z !== undefined) {
      this._planeSystem.position.z = position.z;
    }
  }


  /**
   * Get the position of the center of the plane
   * @return {BABYLON.Vector3} position
   */
  getPosition () {
    return this._planeSystem.position.clone()
  }


  /**
   * Reset the rotation of the _planeSystem
   */
  resetPosition () {
    this._planeSystem.position.x = 0;
    this._planeSystem.position.y = 0;
    this._planeSystem.position.z = 0;
  }


  /**
   * Get the babylonjs scene object, because it's necessary to build textures in Volume
   * @return {BABYLON.Scene} the scene
   */
  getScene () {
    return this._scene;
  }


  /**
   * Mount a volume on the redering engine. This means the 3D texture attached to
   * the given volume will be shown
   * @param  {Number} n - the index of the slot to mount the volume on (most likely 0 or 1)
   * @param  {Volume} volume - the volume to mount
   */
  mountVolumeN (n, volume) {
    if( n>=0 && n < this._mountedVolumes.length ){
      if (this._mountedVolumes[n]) {
        console.warn("Replacing a volume already mounted on slot " + n);
      }

      this._mountedVolumes[n] = volume;
      this._shaderMaterial.setTexture( "vol_" + n + "_texture3D", volume.getTexture3D() )
      this._shaderMaterial.setMatrix( "vol_" + n + "_transfoMat", volume.getMatrix("v2t") )
      this._shaderMaterial.setInt( "vol_" + n + "_timeVal", 0 )
      this._shaderMaterial.setInt( "vol_" + n + "_timeSize", volume.getTimeLength() )
      this._shaderMaterial.setInt( "vol_" + n + "_textureReady", 1 )
    }else{
      console.warn('the index of the volume to mount is out of range.')
    }
  }


  /**
   * Mounts a volume in the first slot available. Will do nothing if no slot is free.
   * @param  {Volume} volume - the volume to mount
   * @return {Boolean} true if found an ampty slot to mount, false if could not mount it
   */
  mountVolumeOnFirstEmptySlot (volume) {
    let emptySlotIndex = this._mountedVolumes.indexOf( null )
    let isMountable = emptySlotIndex >= 0
    if (isMountable) {
      this.mountVolumeN( emptySlotIndex, volume )
    }

    return isMountable
  }


  /**
   * Unmount the volume that is suposedly mounted on the slot N. this means the
   * texture attached to the volume on slot N will no longer be visible.
   * @param  {[type]} n [description]
   */
  unmountVolumeN (n) {
    if( n>=0 && n < this._mountedVolumes.length ){
      this._mountedVolumes[n] = null
      this._initDefaultTexture (n, this._shaderMaterial)
    }else{
      console.warn('the index of the volume to unmount is out of range.')
    }
  }


  /**
   * Get the total number of volume slot in the reder engine (taken of not)
   * @return {Number}
   */
  getNumberOfVolumeSlots () {
    return this._mountedVolumes.length
  }


  /**
   * Get if the Nth volume slot is already taken or not.
   * @param  {Number}  n - index of the slot
   * @return {Boolean} true if already taken (or out of range), false if free
   */
  isSlotTakenN (n) {
    if( n>=0 && n < this._mountedVolumes.length ){
      return ( !!this._mountedVolumes[n] )
    }else{
      console.warn('the index of the slot is out of range.')
    }
    return true;
  }


  /**
   * Look if the volume with the given id is mounted in a slot
   * @param  {String} id - id of the volume to look for
   * @return {Number} index of the slot where the volume is mounted, or -1 if not mounted
   */
  getSlotIndexFromVolumeId (id) {
    for(let i=0; i<this._mountedVolumes.length; i++){
      if( this._mountedVolumes[i] && this._mountedVolumes[i].getId() === id )
        return i
    }

    return -1;
  }


  /**
   * Get the list of colormaps available, by name
   * @return {Array} Array of strings
   */
  getListOfColormaps () {
    return this._colormapManager.getListOfColormaps()
  }


  /**
   * Define the colormap the use on the texture loaded on the Nth slot
   * @param {Number} n - index of the volume slot (most likely 0 or 1)
   * @param {String} cmName - name of the colormap. Get the list of names with `.getListOfColormaps()`
   */
  setColormapSlotN (n, cmName) {
    if( n>=0 && n < this._mountedVolumes.length ){
      let cmTexture = this._colormapManager.getColormap( cmName )
      if( !cmTexture ){
        console.warn("The colormap named " + cmName + " does not exist")
        return;
      }
      this._shaderMaterial.setTexture( "vol_" + n + "_colormap", cmTexture )
    }else{
      console.warn('the index of the slot is out of range.')
    }
  }


  /**
   * Set the orientation of the colormap used on the slot n, original or flipped
   * @param {Number} orientation - 0 for original, 1 for fliped
   */
  setColormapOrientationSlotN (n, orientation) {
    if( n>=0 && n < this._mountedVolumes.length ){
      this._shaderMaterial.setInt( "vol_" + n + "_colormapFlip", +(!!orientation) )
    }else{
      console.warn('the index of the slot is out of range.')
    }
  }


  /**
   * Get the canvas that represents a colormap. This is convenient when we want to
   * display one or more colormap in the UI.
   * @param  {String} cmName - name of the colormap to get
   * @return {Canvas} The HTML5 Canvas object, ready to be appended to a div
   */
  getColormapsCanvas (cmName) {
    return this._colormapManager.getColormapCanvas( cmName )
  }


  /**
   * Set the brightness value to apply on the volume of the slot n.
   * @param {Number} n - index of the volume slot
   * @param {Number} b - value of the brightness, neutral being 0
   */
  setBrightnessSlotN (n, b=0.) {
    if( n>=0 && n < this._mountedVolumes.length ){
      this._shaderMaterial.setFloat( "vol_" + n + "_brightness", b )
    } else {
      console.warn('the index of the slot is out of range.')
    }
  }


  /**
   * Set the contrast value to apply on the volume of the slot n.
   * @param {Number} n - index of the volume slot
   * @param {Number} b - value of the cotrast, neutral being 1
   */
  setContrastSlotN (n, c=1.) {
    if( n>=0 && n < this._mountedVolumes.length ){
      this._shaderMaterial.setFloat( "vol_" + n + "_contrast", c )
    } else {
      console.warn('the index of the slot is out of range.')
    }
  }


  /**
   * Display of hide the volume hosted on the Nth slot
   * @param  {Boolean} [d=true] - display is true, hide if false
   */
  displayVolumeSlotN (n, d=true) {
    if( n>=0 && n < this._mountedVolumes.length ){
      this._shaderMaterial.setInt( "vol_" + n + "_display", +d )
    } else {
      console.warn('the index of the slot is out of range.')
    }
  }


  /**
   * Set the time index of the volume mounted on the Nth slot.
   * If the time index is higher than the duration of the volume, it will loop with a modulo
   * @param {Number} n - index of the volume slot
   * @param {Number} t - the time index
   */
  setTimeIndexSlotN (n, t) {
    if( n>=0 && n < this._mountedVolumes.length ){
      let timeMax = this._mountedVolumes[n].getTimeLength()
      this._shaderMaterial.setInt( "vol_" + n + "_timeVal", t%timeMax )
    } else {
      console.warn('the index of the slot is out of range.')
    }
  }


  /**
   * must be in [0, 1].
   * if closer to 0, the primary volume is more visible
   * if closer to 1, the secondary volume is more visible
   * @param {Number} r - ratio
   */
  setBlendingRatio (r) {
    this._shaderMaterial.setFloat( "vol_0_vol_1_blendRatio", r )
  }


  /**
   * @private
   * Get the normal vector of a given plane.
   * @param  {String} planeName - name of the plane. Can be 'xy', 'xz' or 'yz'
   * @return {BABYLON.Vector3} the normal vector
   */
  _getPlaneNormalVector ( planeName ) {
    let plane = this._scene.getMeshByName(planeName)

    if (!plane) {
      console.warn('The plane ' + planeName + ' does not exist.');
      return;
    }

    let planeNormal = plane.getFacetNormal(0)
    return planeNormal
  }


  /**
   * @private
   * Check which of the 3 orthogonal plane has its normal vector pointing the most
   * to the same direction as the given vector. It also check for inverse vector.
   * @param  {BABYLON.Vector3} refVec - the reference direction
   * @return {BABYLON.Vector} The normal vector of a plane that goes the most towards the same direction as refVec (or the opposite direction)
   */
  _getDominantPlaneNormal (refVec) {
    let refVecNorm = refVec.normalizeToNew()

    let dotMax = 0
    let dominantVector = 0
    let planes = this._planeSystem.getChildMeshes()

    for (let i=0; i<planes.length; i++) {
      let n = planes[i].getFacetNormal(0)
      let dot = BJSVector3.Dot(refVecNorm, n )
      let absDot = Math.abs(dot)

      if (Math.abs(dot) > dotMax) {
        dotMax = absDot
        dominantVector = (dot > 0) ? n.clone() : n.negate()
      }
    }
    return dominantVector
  }


  /**
   * Get the the one of the 3 normal vectors of the _planeSystem that goes
   * dominantly towards the X direction
   * (Here "dominantly" is deducted by performing a dot product with [!, 0, 0])
   * @return {BABYLON.Vector3} the normal vector (as a clone)
   */
  getXDominantPlaneNormal () {
    return this._getDominantPlaneNormal( new BJSVector3(-1, 0, 0) )
  }


  /**
   * Get the the one of the 3 normal vectors of the _planeSystem that goes
   * dominantly towards the Y direction
   * * (Here "dominantly" is deducted by performing a dot product with [0, 1, 0])
   * @return {BABYLON.Vector3} the normal vector (as a clone)
   */
  getYDominantPlaneNormal () {
    return this._getDominantPlaneNormal( new BJSVector3(0, 1, 0) )
  }


  /**
   * Get the the one of the 3 normal vectors of the _planeSystem that goes
   * dominantly towards the Z direction.
   * (Here "dominantly" is deducted by performing a dot product with [0, 0, 1])
   * @return {BABYLON.Vector3} the normal vector (as a clone)
   */
  getZDominantPlaneNormal () {
    return this._getDominantPlaneNormal( new BJSVector3(0, 0, 1) )
  }


  /**
   * Rotate around the normal vector of the plane system that goes dominantly towards
   * the X direction, from a relative angle (=adding rotation to the current system)
   * @param  {Number} angle - in radian
   */
  rotateAroundXDominant (angle) {
    let axis = this.getXDominantPlaneNormal()
    let center = this._planeSystem.position
    this._planeSystem.rotateAround( center, axis, angle )
    this._callEvent('rotate', [this._planeSystem.rotationQuaternion])
  }


  /**
   * Rotate around the normal vector of the plane system that goes dominantly towards
   * the Y direction, from a relative angle (=adding rotation to the current system)
   * @param  {Number} angle - in radian
   */
  rotateAroundYDominant (angle) {
    let axis = this.getYDominantPlaneNormal()
    let center = this._planeSystem.position
    this._planeSystem.rotateAround( center, axis, angle )
    this._callEvent('rotate', [this._planeSystem.rotationQuaternion])
  }


  /**
   * Rotate around the normal vector of the plane system that goes dominantly towards
   * the Z direction, from a relative angle (=adding rotation to the current system)
   * @param  {Number} angle - in radian
   */
  rotateAroundZDominant (angle) {
    let axis = this.getZDominantPlaneNormal()
    let center = this._planeSystem.position
    this._planeSystem.rotateAround( center, axis, angle )
    this._callEvent('rotate', [this._planeSystem.rotationQuaternion])
  }


  /**
   * Translate the plane system along the dominant X direction
   * @param  {Number} d - the distance to move along this vector (can be negative to move back)
   */
  translateAlongXDominant (d) {
    let dominantVector = this.getXDominantPlaneNormal()
    let translation = dominantVector.multiplyByFloats( d, d, d  )
    this._planeSystem.position.addInPlace( translation )
  }

  /**
   * Translate the plane system along the dominant Y direction
   * @param  {Number} d - the distance to move along this vector (can be negative to move back)
   */
  translateAlongYDominant (d) {
    let dominantVector = this.getYDominantPlaneNormal()
    let translation = dominantVector.multiplyByFloats( d, d, d  )
    this._planeSystem.position.addInPlace( translation )
  }


  /**
   * Translate the plane system along the dominant X direction
   * @param  {Number} d - the distance to move along this vector (can be negative to move back)
   */
  translateAlongZDominant (d) {
    let dominantVector = this.getZDominantPlaneNormal()
    let translation = dominantVector.multiplyByFloats( d, d, d )
    this._planeSystem.position.addInPlace( translation )
  }


  /**
   * Get the Euler angle of the plane system
   * @return {BABYLON.Vector3} The Euler angle
   */
  getPlaneSystemEulerAngle () {
    let eulerAngle = this._planeSystem.rotationQuaternion.toEulerAngles()
    return eulerAngle
  }


  /**
   * Set the Euler angle of the plane system
   * @param {Number} x - Rotation on x
   * @param {Number} y - Rotation on y
   * @param {Number} z - Rotation on z
   */
  setPlaneSystemEulerAngle (x, y, z) {
    let newQuat = BJSQuaternion.RotationYawPitchRoll(y, x, z)
    this._planeSystem.rotationQuaternion = newQuat
    this._callEvent('rotate', [this._planeSystem.rotationQuaternion])
  }


}

export { RenderEngine }
