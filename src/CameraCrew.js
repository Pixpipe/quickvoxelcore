/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/quickvoxelcore
* Lab      MCIN - Montreal Neurological Institute
*/

import {
  Engine as BJSEngine,
  Scene as BJSScene,
  Color3 as BJSColor3,
  Mesh as BJSMesh,
  ArcRotateCamera as BJSArcRotateCamera,
  TargetCamera as BJSTargetCamera,
  FreeCamera as BJSFreeCamera,
  Vector3 as BJSVector3,
  Matrix as BJSMatrix,
  Quaternion as BJSQuaternion
} from 'babylonjs/es6.js'

import { EventManager } from './EventManager.js'
import { getKeyFromValue } from './Tools.js'

/**
 * The CameraCrew provides four cameras (1 perspective and 3 orthographic) and
 * a simplified API to control them. This include:
 * - selection of the camera (for all 4 cams)
 * - rotation (keep the target but change the up) - relative and absolute (only for ortho)
 * - enlarging ratio - relative and absolute (only for ortho)
 * - panning - relative and absolute (only for ortho)
 *
 * As you can read, the fine tunings are not available with the perspective camera,
 * this is because a mouse control is attached to it.
 * These functions are accesible by giving the name of the camera as argument.
 * Camera have names they were initialized with: 'aOrtho', 'bOrtho' and 'cOrtho',
 * in addition to the 'main', which is the perspective cam. Those camera can also
 * be called by their shorter names 'a', 'b' and 'c' and by there *direction pointing*
 * names.
 * The *direction pointing* names are names given dinamically to each camera
 * depending on the direction they are pointing. Of course, those names are updated
 * at every single rotation to make sure the *direction pointing* names remain relevant.
 * Those names are 'x', 'y' and 'z' and they refer to the MNI space (or Talairach coordinates).
 *
 * When using the CameraCrew in 'sinel view' mode (default, the view from only one camera is shown)
 * then, the name 'current' can also be used to address the camera currenlty being used.
 * @extends EventManager
 */
class CameraCrew extends EventManager {
  /**
   * Build the CameraCrew instance, using a BABYLON.Scene instance
   * @param {RenderEngine} renderEngine - the renderEngine instance created by QuickVoxelCore
   * @param {Canvas} canvasElem - the canvas DOM element used by QuickVoxelCore
   */
  constructor (renderEngine, canvasElem) {
    super()
    this._renderEngine = renderEngine
    this._scene = renderEngine.getScene()
    this._canvas = canvasElem
    this._planeSystem = this._scene.getMeshByName('orthoPlaneSystem')
    this._isSingleView = true
    this._currentCam = null

    this._orthoCamDistance = 500
    this._canvasRatio = this._canvas.height / this._canvas.width
    this._perspectiveCamName = 'main'

    this._orthoCamCarrier = {
      aOrtho: null,
      bOrtho: null,
      cOrtho: null
    }
    this._initOrthoCamCarriers()


    // originally, the 'xOtho' camera points toward the x direction, but this might
    // change after some successive rotation, so this structure keeps track of it
    // and is updated at every rotation
    this._axisToCamera = {
      x: 'aOrtho',
      y: 'bOrtho',
      z: 'cOrtho'
    }
    this._axisToCamera[ this._perspectiveCamName ] = this._perspectiveCamName

    // the span, which is like the FOV but for perspective cam
    this._orthoCamSpan = {
      aOrtho: 250,
      bOrtho: 250,
      cOrtho: 250
    }

    // all the camera objects, the orthos are initialized by _initOrthoCamera()
    this._cameras = {
      aOrtho: null,
      bOrtho: null,
      cOrtho: null
    }
    this._cameras[ this._perspectiveCamName ] = this._initPerspectiveCamera()

    // so that we can address ortho cam with a shorter name
    this._orthoCamShortNames = {
      a: 'aOrtho',
      b: 'bOrtho',
      c: 'cOrtho'
    }
    this._orthoCamShortNames[ this._perspectiveCamName ] = this._perspectiveCamName

    // anatomical names match to an axis direction
    this._orthoCamAnatomicalNames = {
      sagittal: 'x',
      coronal: 'y',
      axial: 'z'
    }
    this._orthoCamAnatomicalNames[ this._perspectiveCamName ] = this._perspectiveCamName

    this._initOrthoCamera()
    this._initEvent()

    // The default camera is the 'main' aka. the perspective camera
    this.defineCamera(this._perspectiveCamName)
  }


  /**
   * @private
   * Initialize some events
   * @return {[type]} [description]
   */
  _initEvent () {
    let that = this

    // when the window is resized, the internal canvas is possibly resized.
    window.onresize = function() {
      that._canvasRatio = that._canvas.height / that._canvas.width
      that._updateAllOrthoCamSpan()
    }


    this._renderEngine.on('rotate', function(quat, axis, angle){
      that._updateOrthoCamDirectionLUT()

      // if the axis is not give, it means it's an arbitrary rotation
      // and nor a rotation perfomed around one of the plane normal vector
      if (!axis) {
        that._orthoCamCarrier.aOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
        that._orthoCamCarrier.bOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
        that._orthoCamCarrier.cOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
        return
      }

      // if the rotation is around the normal vector of the ortho plane (one of the 3),
      // we apply the rotation on the all the ortho cam except the one that has its
      // directional vector along the rotation axis. This is to prevent the volume from
      // spinning CW when this ortho cam is chosen.
      let closestOrthoCam = that._getOrthoCamDominantDirection (axis)
      if (closestOrthoCam !== 'aOrtho')
        that._orthoCamCarrier.aOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      if (closestOrthoCam !== 'bOrtho')
        that._orthoCamCarrier.bOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      if (closestOrthoCam !== 'cOrtho')
        that._orthoCamCarrier.cOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
    })

    // when a translation of the ortho planes is done, the main (perspective) camera follows
    // the center.
    this._renderEngine.on('translate', function(newPosition){
      that._cameras[ that._perspectiveCamName ].setTarget(newPosition)
    })
  }


  /**
   * @private
   * Initialize the carrier of the ortho cams
   */
  _initOrthoCamCarriers () {
    this._orthoCamCarrier.aOrtho = new BJSMesh( "aOrthoCamCarrier", this._scene )
    this._orthoCamCarrier.aOrtho.rotationQuaternion = BJSQuaternion.Identity()

    this._orthoCamCarrier.bOrtho = new BJSMesh( "bOrthoCamCarrier", this._scene )
    this._orthoCamCarrier.bOrtho.rotationQuaternion = BJSQuaternion.Identity()

    this._orthoCamCarrier.cOrtho = new BJSMesh( "cOrthoCamCarrier", this._scene )
    this._orthoCamCarrier.cOrtho.rotationQuaternion = BJSQuaternion.Identity()
  }


  /**
   * @private
   * Initialize the perspective cacamera
   * @return {BABYLON.Camera} a viable perspective camera
   */
  _initPerspectiveCamera () {
    let mainCam = new BJSArcRotateCamera(this._perspectiveCamName, Math.PI / 2, Math.PI / 2, 2, BJSVector3.Zero(), this._scene)
    mainCam.inertia = 0.7;
    mainCam.setPosition( new BJSVector3(300, 300, 300) )
    mainCam.attachControl( this._canvas, true, false )
    mainCam.upperBetaLimit = null
    mainCam.lowerBetaLimit = null
    mainCam.panningSensibility﻿ = 30;

    // remove the pole lock
    this._scene.registerBeforeRender(function(){
      if(mainCam.beta <= 0){
        mainCam.beta += Math.PI * 2
      }
    });

    return mainCam
  }


  /**
   * @private
   * Initialize the ortho camera. The name given to them ('aOrtho', 'bOrtho', 'cOrtho') is
   * based on their original target axis. The successive rotations that can be performed on there
   * respective `_orthoCamCarrier` will induce their name to become irrelevant
   *
   */
  _initOrthoCamera () {
    let d = this._orthoCamDistance

    let name = 'aOrtho'
    let aOrthoPosition = this._renderEngine.getXDominantPlaneNormal().multiplyByFloats(d, d, d)
    this._cameras[name] = new BJSFreeCamera(name, aOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].rotation.z = Math.PI/2 // should def be rotation on x but BJS seems messed up on that...
    this._cameras[name].rotationOrig = this._cameras[name].rotation.clone() // saves the original rotation
    this._cameras[name].positionOrig = this._cameras[name].position.clone() // saves the original position
    this._cameras[name].parent = this._orthoCamCarrier.aOrtho
    //this._scene.activeCameras.push(this._cameras[name])

    name = 'bOrtho'
    let bOrthoPosition = this._renderEngine.getYDominantPlaneNormal().multiplyByFloats(-d, -d, -d) // minus sign to look from behind (right is right)
    this._cameras[name] = new BJSFreeCamera(name, bOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].rotationOrig = this._cameras[name].rotation.clone()
    this._cameras[name].positionOrig = this._cameras[name].position.clone() // saves the original position
    this._cameras[name].parent = this._orthoCamCarrier.bOrtho
    //this._scene.activeCameras.push(this._cameras[name])

    name = 'cOrtho'
    let cOrthoPosition = this._renderEngine.getZDominantPlaneNormal().multiplyByFloats(d, d, d)
    this._cameras[name] = new BJSFreeCamera(name, cOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].rotationOrig = this._cameras[name].rotation.clone()
    this._cameras[name].positionOrig = this._cameras[name].position.clone() // saves the original position
    this._cameras[name].parent = this._orthoCamCarrier.cOrtho
    //this._scene.activeCameras.push(this._cameras[name])

    this._updateAllOrthoCamSpan()
  }


  /**
   * @private
   * This method retrieves the native camera name based on one of the name a camera can be called by.
   * This includes the actual name 'aOrtho', 'bOrtho', 'cOrtho' but also their
   * short name 'a', 'b', 'c'. It also works with the name of the dominant
   * axis (world) they are pointing to 'x', 'y', 'z'
   * (note that the later one is updated at every rotation of the plane)
   * In addtion, it can also be 'current' to get the name of the camera currently being used (this is when not using multicam)
   * @param {String} name - one of the name of a camera
   * @return {String} the native camera name, or null if name not found
   */
  _getCameraNameByName ( name ) {

    if (name === 'current') {
      return this._currentCam
    }

    // using the actual (full) name
    if (name in this._cameras) {
      return name
    }

    // using the short name
    if (name in this._orthoCamShortNames) {
      return this._orthoCamShortNames[name]
    }

    // using the dominant direction
    if (name in this._axisToCamera) {
      return this._axisToCamera[name]
    }

    // using the anatomical name leads to choose a main direction
    if (name in this._orthoCamAnatomicalNames) {
      return this._axisToCamera[this._orthoCamAnatomicalNames[name]]
    }

    return null
  }


  /**
   * Get the dominant axis name from the native camera name
   * @param  {String}  camName - native camera name, such as 'aOtho', 'bOrtho' or 'cOrtho'
   * @return {String} dominant axis name of the camera target vector, such as 'x', 'y' or 'z'
   */
  _getCameraAxisNameFromNativeName (camName) {
    return getKeyFromValue( this._axisToCamera, camName )
  }


  /**
   * Get the anatomical name of the camera currently being used.
   * @return {String} 'coronal', 'sagittal', 'axial' or 'main' (for perspective)
   */
  getCurrentCameraAnatomicalName () {
    let axisName = this._getCameraAxisNameFromNativeName( this._currentCam )
    let anatName = getKeyFromValue( this._orthoCamAnatomicalNames, axisName )
    return anatName
  }


  /**
   * Get the dominant axis name of the camera currenlty in use
   * @return {String} 'x', 'y', 'z' or 'main' (for perspective)
   */
  getCurrentCameraMainAxis () {
    let axisName = this._getCameraAxisNameFromNativeName( this._currentCam )
    return axisName
  }


  /**
   * Update the span of a given orthographic camera.
   * Bear in mind two things:
   * - the span is doubled (once on each direction of the cam starting from the center)
   * - the span given is horizontal and the vertical span will be deducted based  on the ratio of the canvas.
   * @param {String} camName - name of the camera ('main', 'aOrtho', 'bOrtho', 'cOrtho')
   * @param {Number} span - Like the FOV but for an orthographic camera. Must be positive.
   */
  setOrthoCamSpan (camName, span) {
    camName = this._getCameraNameByName(camName)
    if (!camName)
      return

    if (this._isPerspectiveCam(camName)) {
      console.warn('This feature is not available for the perspective camera.')
      return
    }

    this._orthoCamSpan[camName] = span
    this._updateOrthoCamSpan(camName)
  }


  /**
   * Multiply the enlargement of the ortho cam by a factor.
   * A factor lower than 1 will make the image smaller, a factor higher than 1 will make the image bigger.
   * Note: Under the hood, the camera span is multiplied by (1/factor).
   * @param  {String} camName - name of the camera
   * @param  {Number} factor - ratio to multiply the cam span with
   */
  zoomCamSpan (camName, factor) {
    camName = this._getCameraNameByName(camName)
    if (!camName)
      return

    if (this._isPerspectiveCam(camName)) {
      console.warn('This feature is not available for the perspective camera.')
      return
    }

    this._orthoCamSpan[camName] /= factor
    this._updateOrthoCamSpan(camName)
  }


  /**
   * Get the span used on the given camera.
   * @param  {String} camName - one of the name of an orthographic camera
   * @return {Number} the span curetly being used by this camera
   */
  getOthoCamSpan (camName) {
    camName = this._getCameraNameByName(camName)
    if (!camName)
      return

    if (this._isPerspectiveCam(camName)) {
      console.warn('This feature is not available for the perspective camera.')
      return
    }

    return this._orthoCamSpan[camName]
  }


  /**
   * @private
   * Update the FOV of a given ortho cam, based on its span.
   * Note: the span of a spacific ortho cam is changed by `setOrthoCamSpan()`
   * @param  {String} camName - name of the camera ('main', 'aOrtho', 'bOrtho', 'cOrtho')
   */
  _updateOrthoCamSpan (camName) {
    this._cameras[camName].orthoLeft = -this._orthoCamSpan[camName]
    this._cameras[camName].orthoRight = this._orthoCamSpan[camName]
    this._cameras[camName].orthoTop = this._orthoCamSpan[camName] * this._canvasRatio
    this._cameras[camName].orthoBottom = -this._orthoCamSpan[camName] * this._canvasRatio
  }


  /**
   * @private
   * Update all FOV of all ortho camera based on their span
   */
  _updateAllOrthoCamSpan () {
    let orthoCamNames = Object.keys( this._orthoCamSpan )
    for (let i=0; i<orthoCamNames.length; i++) {
      this._updateOrthoCamSpan( orthoCamNames[i] )
    }
  }


  /**
   * Get the list of camera names
   * @return {Array} Array of strings, most likely ['main', 'aOrtho', 'bOrtho', 'cOrtho']
   */
  getListOfCameras () {
    return Object.keys(this._cameras)
  }


  /**
   * Define what camera to use, by its name.
   * @param  {String} camName - name of the camera ('main', 'aOrtho', 'bOrtho', 'cOrtho')
   */
  defineCamera (camName) {
    camName = this._getCameraNameByName(camName)
    if (!camName)
      return

    if (camName in this._cameras) {
      this._scene.activeCamera = this._cameras[camName]
      this._currentCam = camName
    } else {
      console.warn('The camera named ' +  + ' does not exist.');
    }
  }


  /**
   * Define the absolute angle of the camera, considering the original position represents
   * the origin. This rotation will modify the upVector but keep the direction the camera is pointing
   * @param  {String} camName - name of the camera ('aOrtho', 'bOrtho', 'cOrtho')
   * @param  {Number} angle - angle in radian (0 is noon, +pi/4 is 3oclock, +pi/2 is 6oclock, -pi/4 is 9oclock)
   */
  angleOrthoCam (camName, angle) {
    camName = this._getCameraNameByName(camName)
    if (!camName)
      return

    if (this._isPerspectiveCam(camName)) {
      console.warn('This feature is not available for the perspective camera.')
      return
    }

    if (camName === 'aOrtho')
      this._cameras[camName].rotation.z = this._cameras[camName].rotationOrig.z + angle
    else if (camName === 'bOrtho')
      this._cameras[camName].rotation.y = this._cameras[camName].rotationOrig.y + angle
    else if (camName === 'cOrtho')
      this._cameras[camName].rotation.z = this._cameras[camName].rotationOrig.z + angle
  }


  /**
   * Rotates the given camera relatively to its current state. The camera will keep its direction,
   * only the upVector will be changed (giving the impresion of image spinning)
   * @param  {String} camName - name of the camera ('aOrtho', 'bOrtho', 'cOrtho')
   * @param  {Number} angle - relative angle in radian
   */
  rotateOrthoCam (camName, angle) {
    camName = this._getCameraNameByName(camName)
    if (!camName)
      return

    if (this._isPerspectiveCam(camName)) {
      console.warn('This feature is not available for the perspective camera.')
      return
    }

    if (camName === 'aOrtho')
      this._cameras[camName].rotation.z += angle
    else if (camName === 'bOrtho')
      this._cameras[camName].rotation.y += angle
    else if (camName === 'cOrtho')
      this._cameras[camName].rotation.z += angle
  }


  /**
   * Modify the absolute position of the camera on its axis. The default position is (0, 0)
   * when the camera is centered on the ortho planes origin.
   * @param  {String} camName - name of the camera ('aOrtho', 'bOrtho', 'cOrtho')
   * @param  {Number} right - horizontal position of the camera on its axis. Positive is right, negative is left
   * @param  {Number} up - vertical position of the camera on its axis. positive is up, negative is down
   */
  positionOrthoCam (camName, right=0, up=0) {
    camName = this._getCameraNameByName(camName)
    if (!camName)
      return

    if (this._isPerspectiveCam(camName)) {
      console.warn('This feature is not available for the perspective camera.')
      return
    }

    // up = +z
    // right = +y
    if (camName === 'aOrtho') {
      this._cameras[camName].position.z = up
      this._cameras[camName].position.y = right
    }


    // up = +z
    // right = +x (but -x in webgl)
    if (camName === 'bOrtho') {
      this._cameras[camName].position.z = up
      this._cameras[camName].position.x = right
    }

    // up = +y
    // right = +x (but -x in webgl)
    if (camName === 'cOrtho') {
      this._cameras[camName].position.y = up
      this._cameras[camName].position.x = right
    }

  }


  /**
   * Moves the given camera relatively to its curent position.
   * If the `right` and `up` come from screen coordinates, it is most likely that
   * the alternative method `.translateOrthoCamScreenAlign()` is the one to use.
   * @param  {String} camName - name of the camera ('aOrtho', 'bOrtho', 'cOrtho')
   * @param  {Number} right - moves to the right when positive, moves the the left when negative
   * @param  {Number} up - moves up when positive, moves down when negative
   */
  translateOrthoCam (camName, right, up) {
    camName = this._getCameraNameByName(camName)
    if (!camName)
      return

    if (this._isPerspectiveCam(camName)) {
      console.warn('This feature is not available for the perspective camera.')
      return
    }

    // up = +z
    // right = +y
    if (camName === 'aOrtho') {
      this._cameras[camName].position.z += up
      this._cameras[camName].position.y += right
    }

    // up = +z
    // right = +x (but -x in webgl)
    if (camName === 'bOrtho') {
      this._cameras[camName].position.z += up
      this._cameras[camName].position.x -= right
    }

    // up = +y
    // right = +x (but -x in webgl)
    if (camName === 'cOrtho') {
      this._cameras[camName].position.y += up
      this._cameras[camName].position.x -= right
    }
  }


  /**
   * Moves the given camera relatively to its curent position when using screen coordinates.
   * Contrary to `.translateOrthoCam()`, this method takes in account the rotation of the camera (if any).
   * This method is most likely the one to use when the `right` and `up` (aka. dx and dy)
   * come from screen coordinates such as mouse/pointer.
   * @param  {String} camName - name of the camera ('aOrtho', 'bOrtho', 'cOrtho')
   * @param  {Number} right - moves to the right when positive, moves the the left when negative
   * @param  {Number} up - moves up when positive, moves down when negative
   */
  translateOrthoCamScreenAlign (camName, right, up) {
    camName = this._getCameraNameByName(camName)
    if (!camName)
      return

    if (this._isPerspectiveCam(camName)) {
      console.warn('This feature is not available for the perspective camera.')
      return
    }

    // up = +z
    // right = +y
    if (camName === 'aOrtho') {
      let theta = this._cameras[camName].rotation.z
      this._cameras[camName].position.z += ( up*Math.sin(theta) - right*Math.cos(theta) )
      this._cameras[camName].position.y += ( up*Math.cos(theta) + right*Math.sin(theta) )

    }

    // up = +z
    // right = +x (but -x in webgl)
    if (camName === 'bOrtho') {
      let theta = this._cameras[camName].rotation.y
      this._cameras[camName].position.z -= ( up*Math.cos(theta) + right*Math.sin(theta) )
      this._cameras[camName].position.x -= ( up*Math.sin(theta) - right*Math.cos(theta) )
    }

    // up = +y
    // right = +x (but -x in webgl)
    if (camName === 'cOrtho') {
      let theta = this._cameras[camName].rotation.z
      this._cameras[camName].position.y += ( up*Math.cos(theta) + right*Math.sin(theta) )
      this._cameras[camName].position.x += ( up*Math.sin(theta) - right*Math.cos(theta) )
    }
  }


  /**
   * @private
   * Get the ortho cam that points the most towards the given direction.
   * (a dot product is performed for that)
   * @param  {BABYLON.Vector3} refVec - a reference vector to test with
   * @return {String} the ortho cam name that points the most towards this direction ('aOrtho', 'bOrtho' or 'cOrtho')
   */
  _getOrthoCamDominantDirection (refVec) {
    let refVecNorm = refVec.normalizeToNew()

    let dotMax = 0
    let dominantVector = 0
    let orthoCams = Object.keys( this._orthoCamCarrier )
    let okCam = null

    for (let i=0; i<orthoCams.length; i++) {
      let camName = orthoCams[i]
      let n = this._getOrthoCamWorldDirection(camName)
      let dot = BJSVector3.Dot(refVecNorm, n )
      let absDot = Math.abs(dot)

      if (Math.abs(dot) > dotMax) {
        dotMax = absDot
        okCam = camName
      }
    }
    return okCam
  }


  /**
   * @private
   * Retrieve the normal vector in world coordinates towards which the camera points.
   * Note that the x (left-right) is in native webGL (not reversed as in MNI space of Talairach coordinates)
   * @param  {String} camName - name of the camera ('aOrtho', 'bOrtho', 'cOrtho')
   * @return {[type]}         [description]
   */
  _getOrthoCamWorldDirection (camName) {
    camName = this._getCameraNameByName(camName)
    if (!camName)
      return

    let cam = this._cameras[camName]
    let carrier = this._orthoCamCarrier[camName]

    // vector from the camera to the origin
    let localCamDirection = cam.positionOrig.negate()
    let camCarrierWorldMat = carrier.getWorldMatrix() //cam.computeWorldMatrix(true)
    let worldCamDir = BJSVector3.TransformCoordinates( localCamDirection, camCarrierWorldMat).normalize()
    return worldCamDir
  }


  /**
   * Get the camera pointing normalized vector.
   * Note: this vector complied to MNI space and Talairach coordinates regarding the 'x' axis,
   * which means +x is on the right and -x is on the left (which is the opposite of OpenGL/WebGL conventions)
   * @param  {String} camName - one of the name of the camera
   * @return {Object} normalized vector {x: Number, y: Number, z: Number}
   */
  getCamTargetVector (camName) {
    camName = this._getCameraNameByName(camName)

    if (this._isPerspectiveCam(camName)) {
      console.warn('This feature is not available for the perspective camera.')
      return
    }

    let webGlSpaceVector = this._getOrthoCamWorldDirection(camName)
    return {
      x: webGlSpaceVector.x * -1,
      y: webGlSpaceVector.y,
      z: webGlSpaceVector.z
    }
  }


  /**
   * Get the ortho cam that points the most towards X direction.
   * Note: due to the sucessive rotation potentially performed on this camera, it
   * is possible that the name of this camera is not 'aOrtho'
   * @param {Boolean} forceRecompute - force recomputing is true, get last value from the LUT if false (default: false)
   * @return {String} the name of the camera pointing towards X direction
   */
  getXDominantOrthoCam (forceRecompute=false) {
    if (forceRecompute)
      return this._getOrthoCamDominantDirection (new BJSVector3(1, 0, 0))
    else
      return this._axisToCamera.x
  }


  /**
   * Get the ortho cam that points the most towards Y direction.
   * Note: due to the sucessive rotation potentially performed on this camera, it
   * is possible that the name of this camera is not 'bOrtho'
   * @param {Boolean} forceRecompute - force recomputing is true, get last value from the LUT if false (default: false)
   * @return {String} the name of the camera pointing towards Y direction
   */
  getYDominantOrthoCam (forceRecompute=false) {
    if (forceRecompute)
      return this._getOrthoCamDominantDirection (new BJSVector3(0, 1, 0))
    else
      return this._axisToCamera.y
  }


  /**
   * Get the ortho cam that points the most towards Z direction.
   * Note: due to the sucessive rotation potentially performed on this camera, it
   * is possible that the name of this camera is not 'cOrtho'
   * @param {Boolean} forceRecompute - force recomputing is true, get last value from the LUT if false (default: false)
   * @return {String} the name of the camera pointing towards Z direction
   */
  getZDominantOrthoCam (forceRecompute=false) {
    if (forceRecompute)
      return this._getOrthoCamDominantDirection (new BJSVector3(0, 0, 1))
    else
      return this._axisToCamera.z
  }


  /**
   * @private
   * Update the LUT that matches the dominant direction to an orthocam
   * @return {[type]} [description]
   */
  _updateOrthoCamDirectionLUT () {
    this._axisToCamera.x = this.getXDominantOrthoCam(true)
    this._axisToCamera.y = this.getYDominantOrthoCam(true)
    this._axisToCamera.z = this.getZDominantOrthoCam(true)
  }


  _isPerspectiveCam (camName) {
    return (this._perspectiveCamName === camName)
  }


  /**
   * Tell if the CameraCrew is currently using an orthographic camera in the 'single view' mode
   * @return {Boolean} true is using an orthographic, false if using the perspective cam (and false if in multi view)
   */
  isUsingOrthoCam () {
    return ((this._currentCam !== this._perspectiveCamName) && this._isSingleView)
  }
}

export { CameraCrew }
