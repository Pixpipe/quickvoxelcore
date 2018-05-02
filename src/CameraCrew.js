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

class CameraCrew {
  /**
   * Build the CameraCrew instance, using a BABYLON.Scene instance
   * @param {[type]} bjsScene [description]
   */
  constructor (renderEngine, canvasElem) {
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

    this._orthoCamSpan = {
      xOrtho: 250,
      yOrtho: 250,
      zOrtho: 250
    }

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


    this._renderEngine.on('rotate', function(quat, dominantRotationAxisName){
      that._orthoCamCarrier.xOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      that._orthoCamCarrier.yOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      that._orthoCamCarrier.zOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)

      return

      if (dominantRotationAxisName === 'x') {
        that._orthoCamCarrier.yOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
        that._orthoCamCarrier.zOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      } else if (dominantRotationAxisName === 'y') {
        that._orthoCamCarrier.xOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
        that._orthoCamCarrier.zOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      } else if (dominantRotationAxisName === 'z') {
        that._orthoCamCarrier.xOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
        that._orthoCamCarrier.yOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      }


      return

      let orthoCamWorldUp = null
      let worldMat0 = null
      let worldMat1 = null

      if (dominantRotationAxisName === 'x') {
        worldMat0 = that._cameras.xOrtho.computeWorldMatrix(true)
        orthoCamWorldUp = BJSVector3.TransformNormal( that._cameras.xOrtho.upVector, worldMat0)
      } else if (dominantRotationAxisName === 'y') {
        worldMat0 = that._cameras.yOrtho.computeWorldMatrix(true)
        orthoCamWorldUp = BJSVector3.TransformNormal( that._cameras.yOrtho.upVector, worldMat0)
      } else if (dominantRotationAxisName === 'z') {
        worldMat0 = that._cameras.zOrtho.computeWorldMatrix(true)
        orthoCamWorldUp = BJSVector3.TransformNormal( that._cameras.zOrtho.upVector, worldMat0)
      }

      that._orthoCamCarrier.xOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      that._orthoCamCarrier.yOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      that._orthoCamCarrier.zOrtho.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      that._orthoCamCarrier.xOrtho.computeWorldMatrix(true)
      that._orthoCamCarrier.yOrtho.computeWorldMatrix(true)
      that._orthoCamCarrier.zOrtho.computeWorldMatrix(true)

      if (dominantRotationAxisName === 'x') {
        worldMat1 = that._cameras.xOrtho.computeWorldMatrix(true)
        let worldToLocalMat = BJSMatrix.Invert( worldMat1 )
        let localNewUpVector = BJSVector3.TransformNormal( orthoCamWorldUp, worldToLocalMat)
        that._cameras.xOrtho.upVector.set( localNewUpVector.x, localNewUpVector.y, localNewUpVector.z )

      } else if (dominantRotationAxisName === 'y') {
        worldMat1 = that._cameras.yOrtho.computeWorldMatrix(true)
        let worldToLocalMat = BJSMatrix.Invert(worldMat1 )
        let localNewUpVector = BJSVector3.TransformNormal( orthoCamWorldUp, worldToLocalMat)
        that._cameras.yOrtho.upVector.set( localNewUpVector.x, localNewUpVector.y, localNewUpVector.z )

      } else if (dominantRotationAxisName === 'z') {
        worldMat1 = that._cameras.zOrtho.computeWorldMatrix(true)
        let worldToLocalMat = BJSMatrix.Invert( worldMat1 )
        let localNewUpVector = BJSVector3.TransformNormal( orthoCamWorldUp, worldToLocalMat)
        that._cameras.zOrtho.upVector.set( localNewUpVector.x, localNewUpVector.y, localNewUpVector.z )
      }

      //that._orthoCamSystem.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      // TODO: do something to update the upVector of the plane that is not impacted by this rotation, otherwise, it spins on itself




      //let yCamWorlUpVector = BJSVector3.TransformNormal( that._cameras.yOrtho.upVector, that._cameras.yOrtho.computeWorldMatrix(true) /*getWorldMatrix()*/)
      //console.log( yCamWorlUpVector )

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


  _initOrthoCamera () {
    let d = this._orthoCamDistance


    let name = 'xOrtho'
    let xOrthoPosition = this._renderEngine.getXDominantPlaneNormal().multiplyByFloats(d, d, d)
    this._cameras[name] = new BJSFreeCamera(name, xOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].rotation.z = Math.PI/2 // should def be rotation on x but BJS seems messed up on that...
    this._cameras[name].rotationOrig = this._cameras[name].rotation.clone()
    this._cameras[name].parent = this._orthoCamCarrier.xOrtho
    //this._scene.activeCameras.push(this._cameras[name])

    name = 'yOrtho'
    let yOrthoPosition = this._renderEngine.getYDominantPlaneNormal().multiplyByFloats(-d, -d, -d) // minus sign to look from behind (right is right)
    this._cameras[name] = new BJSFreeCamera(name, yOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].rotationOrig = this._cameras[name].rotation.clone()
    this._cameras[name].parent = this._orthoCamCarrier.yOrtho
    //this._scene.activeCameras.push(this._cameras[name])

    name = 'zOrtho'
    let zOrthoPosition = this._renderEngine.getZDominantPlaneNormal().multiplyByFloats(d, d, d)
    this._cameras[name] = new BJSFreeCamera(name, zOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].rotationOrig = this._cameras[name].rotation.clone()
    this._cameras[name].parent = this._orthoCamCarrier.zOrtho
    //this._scene.activeCameras.push(this._cameras[name])

    this.updateAllOrthoCamSpan()
  }


  updateOrthoCamSpan (camName) {
    this._cameras[camName].orthoLeft = -this._orthoCamSpan[camName]
    this._cameras[camName].orthoRight = this._orthoCamSpan[camName]
    this._cameras[camName].orthoTop = this._orthoCamSpan[camName] * this._canvasRatio
    this._cameras[camName].orthoBottom = -this._orthoCamSpan[camName] * this._canvasRatio
  }


  updateAllOrthoCamSpan () {
    let orthoCamNames = Object.keys( this._orthoCamSpan )
    for (let i=0; i<orthoCamNames.length; i++) {
      this.updateOrthoCamSpan( orthoCamNames[i] )
    }
  }


  getListOfCameras () {
    return Object.keys(this._cameras)
  }


  defineCamera (camName) {
    if (camName in this._cameras) {
      this._scene.activeCamera = this._cameras[camName]
      this._curentCam = camName
    } else {
      console.warn('The camera named ' +  + ' does not exist.');
    }
  }


  angleOrthoCam (camName, angle) {
    if (camName === 'xOrtho')
      this._cameras[camName].rotation.z = this._cameras[camName].rotationOrig.z + angle
    else if (camName === 'yOrtho')
      this._cameras[camName].rotation.y = this._cameras[camName].rotationOrig.y + angle
    else if (camName === 'zOrtho')
      this._cameras[camName].rotation.z = this._cameras[camName].rotationOrig.z + angle
  }

  // TODO rotateOrthoCam, same as angleOrthoCam but relative


  translateOrthoCam (camName, up, right) {
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

}

export { CameraCrew }
