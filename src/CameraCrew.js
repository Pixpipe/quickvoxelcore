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
    let that = this
    this._renderEngine = renderEngine
    this._scene = renderEngine.getScene()
    this._canvas = canvasElem
    this._planeSystem = this._scene.getMeshByName('orthoPlaneSystem')
    this._orthoCamSystem = this._initOrthoCamSystem()
    this._curentCam = null

    this._orthoCamDistance = 500
    this._canvasRatio = this._canvas.height / this._canvas.width
    this._orthoCamSpan = {
      xOrtho: 250,
      yOrtho: 250,
      zOrtho: 250
    }

    this._cameras = {
      main: this._initPerspectiveCamera(),
    }

    this._initOrthoCamera()

    console.log(this._orthoCamSystem);


    this._renderEngine.on('rotate', function(quat){
      that._orthoCamSystem.rotationQuaternion.set(quat.x, quat.y, quat.z, quat.w)
      // TODO: do something to update the upVector of the plane that is not impacted by this rotation, otherwise, it spins on itself
    })


    window.onresize = function() {
      that._canvasRatio = that._canvas.height / that._canvas.width
      that.updateAllOrthoCamSpan()
    }
  }


  _initOrthoCamSystem () {
    let orthoCamSystem = new BJSMesh( "orthoCamSystem", this._scene );
    orthoCamSystem.rotationQuaternion = BJSQuaternion.Identity()
    return orthoCamSystem
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
    this._cameras[name].rotation.z = Math.PI/2 // shoudl def be rotation on x but BJS seems messed up on that...
    this._cameras[name].parent = this._orthoCamSystem
    //this._scene.activeCameras.push(this._cameras[name])

    name = 'yOrtho'
    let yOrthoPosition = this._renderEngine.getYDominantPlaneNormal().multiplyByFloats(-d, -d, -d) // minus sign to look from behind (right is right)
    this._cameras[name] = new BJSFreeCamera(name, yOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].parent = this._orthoCamSystem
    //this._scene.activeCameras.push(this._cameras[name])

    name = 'zOrtho'
    let zOrthoPosition = this._renderEngine.getZDominantPlaneNormal().multiplyByFloats(d, d, d)
    this._cameras[name] = new BJSFreeCamera(name, zOrthoPosition, this._scene)
    this._cameras[name].mode = BJSTargetCamera.ORTHOGRAPHIC_CAMERA
    this._cameras[name].setTarget(BABYLON.Vector3.Zero())
    this._cameras[name].parent = this._orthoCamSystem
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
