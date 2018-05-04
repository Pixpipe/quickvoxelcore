//import * as BABYLON from 'babylonjs/es6.js'
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

class CameraCrew extends EventManager {
  /**
   * Build the CameraCrew instance, using a BABYLON.Scene instance
   * @param {[type]} bjsScene [description]
   */
  constructor (renderEngine, canvasElem) {
    super()
    this._renderEngine = renderEngine
    this._scene = renderEngine.getScene()
    this._canvas = canvasElem
    this._planeSystem = this._scene.getMeshByName('orthoPlaneSystem')

    this._curentCam = null

    this._orthoCamDistance = 500
    this._canvasRatio = this._canvas.height / this._canvas.width

    this._orthoCamCarrier = {
      xOrtho: null,
      yOrtho: null,
      zOrtho: null
    }
    this._initOrthoCamCarriers()

    // originally, the 'xOtho' camera points toward the x direction, but this might
    // change after some successive rotation, so this structure keeps track of it
    // and is updated at every rotation
    this._axisToCamera = {
      x: 'xOrtho',
      y: 'yOrtho',
      z: 'zOrtho'
    }

    // the span, which is like the FOV but for perspective cam
    this._orthoCamSpan = {
      xOrtho: 250,
      yOrtho: 250,
      zOrtho: 250
    }

    // all the camera objects, the orthos are initialized by _initOrthoCamera()
    this._cameras = {
      main: this._initPerspectiveCamera(),
      xOrtho: null,
      yOrtho: null,
      zOrtho: null
    }
    this._initOrthoCamera()

    this._initEvent()

    // The default camera is the 'main' aka. the perspective camera
    this.defineCamera('main')
  }


  _initEvent () {
    let that = this

    // when the window is resized, the internal canvas is possibly resized.
    window.onresize = function() {
      that._canvasRatio = that._canvas.height / that._canvas.width
      that.updateAllOrthoCamSpan()
    }


    this._renderEngine.on('rotate', function(quat, axis, angle){
      that._updateOrthoCamDirectionLUT()

      // if the axis is not give, it means it's an arbitrary rotation
      // and nor a rotation perfomed around one of the plane normal vector
      if (!axis) {
        that._orthoCamCarrier.xOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
        that._orthoCamCarrier.yOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
        that._orthoCamCarrier.zOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
        return
      }

      // if the rotation is around the normal vector of the ortho plane (one of the 3),
      // we apply the rotation on the all the ortho cam except the one that has its
      // directional vector along the rotation axis. This is to prevent the volume from
      // spinning CW when this ortho cam is chosen.
      let closestOrthoCam = that._getOrthoCamDominantDirection (axis)
      if (closestOrthoCam !== 'xOrtho')
        that._orthoCamCarrier.xOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      if (closestOrthoCam !== 'yOrtho')
        that._orthoCamCarrier.yOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      if (closestOrthoCam !== 'zOrtho')
        that._orthoCamCarrier.zOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
    })
  }


  _initOrthoCamCarriers () {
    this._orthoCamCarrier.xOrtho = new BJSMesh( "xOrthoCamCarrier", this._scene )
    this._orthoCamCarrier.xOrtho.rotationQuaternion = BJSQuaternion.Identity()

    this._orthoCamCarrier.yOrtho = new BJSMesh( "yOrthoCamCarrier", this._scene )
    this._orthoCamCarrier.yOrtho.rotationQuaternion = BJSQuaternion.Identity()

    this._orthoCamCarrier.zOrtho = new BJSMesh( "zOrthoCamCarrier", this._scene )
    this._orthoCamCarrier.zOrtho.rotationQuaternion = BJSQuaternion.Identity()
  }


  _initPerspectiveCamera () {
    let mainCam = new BJSArcRotateCamera("main", Math.PI / 2, Math.PI / 2, 2, BJSVector3.Zero(), this._scene);
    mainCam.inertia = 0.7;
    mainCam.setPosition( new BJSVector3(300, 300, 300) )
    mainCam.attachControl( this._canvas, true, true )
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
   * Initialize the ortho camera. The name given to them ('xOrtho', 'yOrtho', 'zOrtho') is
   * based on their original target axis. The successive rotations that can be performed on there
   * respective `_orthoCamCarrier` will induce their name to become irrelevant
   *
   */
  _initOrthoCamera () {
    let d = this._orthoCamDistance

    let name = 'xOrtho'
    let xOrthoPosition = this._renderEngine.getXDominantPlaneNormal().multiplyByFloats(d, d, d)
    this._cameras[name] = new BJSFreeCamera(name, xOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].rotation.z = Math.PI/2 // should def be rotation on x but BJS seems messed up on that...
    this._cameras[name].rotationOrig = this._cameras[name].rotation.clone() // saves the original rotation
    this._cameras[name].positionOrig = this._cameras[name].position.clone() // saves the original position
    this._cameras[name].parent = this._orthoCamCarrier.xOrtho
    //this._scene.activeCameras.push(this._cameras[name])

    name = 'yOrtho'
    let yOrthoPosition = this._renderEngine.getYDominantPlaneNormal().multiplyByFloats(-d, -d, -d) // minus sign to look from behind (right is right)
    this._cameras[name] = new BJSFreeCamera(name, yOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].rotationOrig = this._cameras[name].rotation.clone()
    this._cameras[name].positionOrig = this._cameras[name].position.clone() // saves the original position
    this._cameras[name].parent = this._orthoCamCarrier.yOrtho
    //this._scene.activeCameras.push(this._cameras[name])

    name = 'zOrtho'
    let zOrthoPosition = this._renderEngine.getZDominantPlaneNormal().multiplyByFloats(d, d, d)
    this._cameras[name] = new BJSFreeCamera(name, zOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].rotationOrig = this._cameras[name].rotation.clone()
    this._cameras[name].positionOrig = this._cameras[name].position.clone() // saves the original position
    this._cameras[name].parent = this._orthoCamCarrier.zOrtho
    //this._scene.activeCameras.push(this._cameras[name])

    this.updateAllOrthoCamSpan()
  }


  /**
   * Update the span of a given orthographic camera.
   * Bear in mind two things:
   * - the span is doubled (once on each direction of the cam starting from the center)
   * - the span given is horizontal and the vertical span will be deducted based  on the ratio of the canvas.
   * @param {String} camName - name of the camera ('main', 'xOrtho', 'yOrtho', 'zOrtho')
   * @param {Number} span - Like the FOV but for an orthographic camera. Must be positive.
   */
  setOrthoCamSpan (camName, span) {
    this._orthoCamSpan[camName] = span
    this.updateOrthoCamSpan(camName)
  }

  // TODO: all these functions that take the name of the ortho camera must be doubled with
  // an equivalent that takes the dominant direction such as `setOrthoCamSpanDominant('x', span)`

  /**
   * Update the FOV of a given ortho cam, based on its span.
   * Note: the span of a spacific ortho cam is changed by `setOrthoCamSpan()`
   * @param  {String} camName - name of the camera ('main', 'xOrtho', 'yOrtho', 'zOrtho')
   */
  updateOrthoCamSpan (camName) {
    this._cameras[camName].orthoLeft = -this._orthoCamSpan[camName]
    this._cameras[camName].orthoRight = this._orthoCamSpan[camName]
    this._cameras[camName].orthoTop = this._orthoCamSpan[camName] * this._canvasRatio
    this._cameras[camName].orthoBottom = -this._orthoCamSpan[camName] * this._canvasRatio
  }


  /**
   * Update all FOV of all ortho camera based on their span
   */
  updateAllOrthoCamSpan () {
    let orthoCamNames = Object.keys( this._orthoCamSpan )
    for (let i=0; i<orthoCamNames.length; i++) {
      this.updateOrthoCamSpan( orthoCamNames[i] )
    }
  }


  /**
   * Get the list of camera names
   * @return {Array} Array of strings, most likely ['main', 'xOrtho', 'yOrtho', 'zOrtho']
   */
  getListOfCameras () {
    return Object.keys(this._cameras)
  }


  /**
   * Define what camera to use, by its name.
   * @param  {String} camName - name of the camera ('main', 'xOrtho', 'yOrtho', 'zOrtho')
   */
  defineCamera (camName) {
    if (camName in this._cameras) {
      this._scene.activeCamera = this._cameras[camName]
      this._curentCam = camName
    } else {
      console.warn('The camera named ' +  + ' does not exist.');
    }
  }


  /**
   * Define the absolute angle of the camera, considering the original position represents
   * the origin. This rotation will modify the upVector but keep the direction the camera is pointing
   * @param  {String} camName - name of the camera ('xOrtho', 'yOrtho', 'zOrtho')
   * @param  {Number} angle - angle in radian (0 is noon, +pi/4 is 3oclock, +pi/2 is 6oclock, -pi/4 is 9oclock)
   */
  angleOrthoCam (camName, angle) {
    if (camName === 'xOrtho')
      this._cameras[camName].rotation.z = this._cameras[camName].rotationOrig.z + angle
    else if (camName === 'yOrtho')
      this._cameras[camName].rotation.y = this._cameras[camName].rotationOrig.y + angle
    else if (camName === 'zOrtho')
      this._cameras[camName].rotation.z = this._cameras[camName].rotationOrig.z + angle
  }


  /**
   * Rotates the given camera relatively to its current state. The camera will keep its direction,
   * only the upVector will be changed (giving the impresion of image spinning)
   * @param  {String} camName - name of the camera ('xOrtho', 'yOrtho', 'zOrtho')
   * @param  {Number} angle - relative angle in radian
   */
  rotateOrthoCam (camName, angle) {
    if (camName === 'xOrtho')
      this._cameras[camName].rotation.z += angle
    else if (camName === 'yOrtho')
      this._cameras[camName].rotation.y += angle
    else if (camName === 'zOrtho')
      this._cameras[camName].rotation.z += angle
  }


  /**
   * Modify the absolute position of the camera on its axis. The default position is (0, 0)
   * when the camera is centered on the ortho planes origin.
   * @param  {String} camName - name of the camera ('xOrtho', 'yOrtho', 'zOrtho')
   * @param  {Number} right - horizontal position of the camera on its axis. Positive is right, negative is left
   * @param  {Number} up - vertical position of the camera on its axis. positive is up, negative is down
   */
  positionOrthoCam (camName, right=0, up=0) {
    // up = +z
    // right = +y
    if (camName === 'xOrtho') {
      this._cameras[camName].position.z = up
      this._cameras[camName].position.y = right
    }


    // up = +z
    // right = +x (but -x in webgl)
    if (camName === 'yOrtho') {
      this._cameras[camName].position.z = up
      this._cameras[camName].position.x = right
    }

    // up = +y
    // right = +x (but -x in webgl)
    if (camName === 'zOrtho') {
      this._cameras[camName].position.y = up
      this._cameras[camName].position.x = right
    }

  }


  /**
   * Moves the given camera relatively to its curent position.
   * @param  {String} camName - name of the camera ('xOrtho', 'yOrtho', 'zOrtho')
   * @param  {Number} right - moves to the right when positive, moves the the left when negative
   * @param  {Number} up - moves up when positive, moves down when negative
   */
  translateOrthoCam (camName, right, up) {
    // up = +z
    // right = +y
    if (camName === 'xOrtho') {
      this._cameras[camName].position.z += up
      this._cameras[camName].position.y += right
    }

    // up = +z
    // right = +x (but -x in webgl)
    if (camName === 'yOrtho') {
      this._cameras[camName].position.z += up
      this._cameras[camName].position.x -= right
    }

    // up = +y
    // right = +x (but -x in webgl)
    if (camName === 'zOrtho') {
      this._cameras[camName].position.y += up
      this._cameras[camName].position.x -= right
    }
  }


  /**
   * Get the ortho cam that points the most towards the given direction.
   * (a dot product is performed for that)
   * @param  {BABYLON.Vector3} refVec - a reference vector to test with
   * @return {String} the ortho cam name that points the most towards this direction ('xOrtho', 'yOrtho' or 'zOrtho')
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
   * The reference direction is the
   * @param  {String} camName - name of the camera ('xOrtho', 'yOrtho', 'zOrtho')
   * @return {[type]}         [description]
   */
  _getOrthoCamWorldDirection (camName) {
    let cam = this._cameras[camName]
    let carrier = this._orthoCamCarrier[camName]

    // vector from the camera to the origin
    let localCamDirection = cam.positionOrig.negate()
    let camCarrierWorldMat = carrier.getWorldMatrix() //cam.computeWorldMatrix(true)
    let worldCamDir = BJSVector3.TransformCoordinates( localCamDirection, camCarrierWorldMat).normalize()
    return worldCamDir
  }


  /**
   * Get the ortho cam that points the most towards X direction.
   * Note: due to the sucessive rotation potentially performed on this camera, it
   * is possible that the name of this camera is not 'xOrtho'
   * @return {BABYLON.Camera} an orthographic camera
   */
  getXDominantOrthoCam (forceRecompute=false) {
    if (forceRecompute)
      return this._axisToCamera.x
    else
      return this._getOrthoCamDominantDirection (new BJSVector3(1, 0, 0))
  }


  /**
   * Get the ortho cam that points the most towards Y direction.
   * Note: due to the sucessive rotation potentially performed on this camera, it
   * is possible that the name of this camera is not 'yOrtho'
   * @return {BABYLON.Camera} an orthographic camera
   */
  getYDominantOrthoCam (forceRecompute=false) {
    if (forceRecompute)
      return this._axisToCamera.y
    else
      return this._getOrthoCamDominantDirection (new BJSVector3(0, 1, 0))
  }


  /**
   * Get the ortho cam that points the most towards Z direction.
   * Note: due to the sucessive rotation potentially performed on this camera, it
   * is possible that the name of this camera is not 'zOrtho'
   * @return {BABYLON.Camera} an orthographic camera
   */
  getZDominantOrthoCam (forceRecompute=false) {
    if (forceRecompute)
      return this._axisToCamera.z
    else
      return this._getOrthoCamDominantDirection (new BJSVector3(0, 0, 1))
  }


  /**
   * @private
   * Update the LUT that matches the dominant direction to an orthocam
   * @return {[type]} [description]
   */
  _updateOrthoCamDirectionLUT () {
    this._axisToCamera = {
      x: this.getXDominantOrthoCam(true),
      y: this.getYDominantOrthoCam(true),
      z: this.getZDominantOrthoCam(true)
    }
  }

}

export { CameraCrew }
