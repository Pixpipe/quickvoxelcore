import * as BABYLON from 'babylonjs/es6.js';
import worldcoordtexture3dFrag from './shaders/worldcoordtexture3d.frag.glsl';
import worldcoordtexture3dVert from './shaders/worldcoordtexture3d.vert.glsl';

const DEFAULT_PLANE_SIZE = 1000;

/**
 * [RenderEngine description]
 */
class RenderEngine {
  /**
   * constructor
   * @param {DomElement} canvasElem - a DOM object of a canvas
   */
  constructor ( canvasElem ) {
    let that = this;
    BABYLON.Effect.ShadersStore["worldCoordVolumeFragmentShader"] = worldcoordtexture3dFrag;
    BABYLON.Effect.ShadersStore["worldCoordVolumeVertexShader"] = worldcoordtexture3dVert;

    this._canvas = canvasElem;
    this._engine = new BABYLON.Engine(this._canvas, true);
    this._scene = new BABYLON.Scene(this._engine);
    this._cameras = {
      main: this._initMainCamera(),
    }
    this._emptyTexture3D = this._initEmpty3dTexture();
    this._shaderMaterial = this._initShaderMaterial();
    this._planeSystem = this._initOrthoPlaneSystem();

    this._engine.runRenderLoop(function () {
      that._scene.render();
    });

    window.addEventListener("resize", function () {
      that._engine.resize();
    });
  }


  /**
   * Initialize the default (main) camera. The main camera is a regular perspective cemera (aka. not ortho)
   */
  _initMainCamera () {
    let mainCam = new BABYLON.ArcRotateCamera("main", Math.PI / 2, Math.PI / 2, 2, BABYLON.Vector3.Zero(), this._scene);
    mainCam.inertia = 0.7;
    mainCam.setPosition( new BABYLON.Vector3(250, 250, 250) )
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

  _initEmpty3dTexture () {
    return new BABYLON.RawTexture3D( new Uint8Array(1),1,1,1,BABYLON.Engine.TEXTUREFORMAT_LUMINANCE, this._scene);
  }


  _initShaderMaterial () {
    let shaderMaterial = new BABYLON.ShaderMaterial(
      'shad',
      this._scene,
      {
        vertexElement: "worldCoordVolume",
        fragmentElement: "worldCoordVolume"
      },
      {
        attributes: ["position", "normal", "uv"],
        uniforms: ["world", "worldView", "worldViewProjection", "transfoMat", "texture3D", "textureReady"]
      });

    // setting some default values
    shaderMaterial.setInt("textureReady", 0);
    shaderMaterial.setInt("timeVal", 0);
    shaderMaterial.setInt("timeSize", 1);
    shaderMaterial.setTexture("texture3D", this._emptyTexture3D);

    return shaderMaterial;
  }


  /**
   * Design a plane system composed of 3 orthogonal planes, each of them being 1000x1000
   * @return {[type]} [description]
   */
  _initOrthoPlaneSystem () {
    let orthoPlaneSystem = new BABYLON.Mesh( "orthoPlaneSystem", this._scene );

    let xyPlane = BABYLON.MeshBuilder.CreatePlane(
      "xyOrthoPlane",
      {
        height:DEFAULT_PLANE_SIZE,
        width: DEFAULT_PLANE_SIZE,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
      }, this._scene);
    xyPlane.parent = orthoPlaneSystem;
    xyPlane.material = this._shaderMaterial

    let xzPlane = BABYLON.MeshBuilder.CreatePlane(
      "xzOrthoPlane",
      {
        height:DEFAULT_PLANE_SIZE,
        width: DEFAULT_PLANE_SIZE,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
      }, this._scene);
    xzPlane.rotation.x = Math.PI/2;
    xzPlane.parent = orthoPlaneSystem;
    xzPlane.material = this._shaderMaterial;

    let yzPlane = BABYLON.MeshBuilder.CreatePlane(
      "yzOrthoPlane",
      {
        height:DEFAULT_PLANE_SIZE,
        width: DEFAULT_PLANE_SIZE,
        sideOrientation: BABYLON.Mesh.DOUBLESIDE
      }, this._scene);
    yzPlane.rotation.y = Math.PI/2;
    yzPlane.parent = orthoPlaneSystem;
    yzPlane.material = this._shaderMaterial;

    return orthoPlaneSystem;
  }

  /**
   * Set the position of a given camera, by its id
   * @param {String} cameraId - the id of the camera
   * @param {Object} position={x:100, y:100, z:100} - position of the camera
   */
  setCameraPosition ( cameraId, position={x:100, y:100, z:100}) {
    if( cameraId in this._cameras ){
      this._cameras[ cameraId ].setPosition( new BABYLON.Vector3(position.x, position.y, position.z) );
    }else{
      console.warn(`Camera with the id ${cameraId} does not exist`);
    }
  }


  /**
   * Update the position of the center of the _planeSystem in world coordinates.
   * Not each position property have to be updated.
   * @param  {Object} [position={x:null, y:null, z:null}] - The new position
   */
  updatePlaneSystemPosition (position={x:null, y:null, z:null}) {
    if (position.x !== null) {
      this._planeSystem.position.x = position.x;
    }

    if (position.y !== null) {
      this._planeSystem.position.y = position.y;
    }

    if (position.z !== null) {
      this._planeSystem.position.z = position.z;
    }
  }


  /**
   * Update the rotation of the _planeSystem in world coordinates, around its center.
   * @param  {Object} [rotation={x:null] [description]
   * @param  {[type]} y                  [description]
   * @param  {[type]} z                  [description]
   * @return {[type]}                    [description]
   */
  updatePlaneSystemRotation(rotation={x:null, y:null, z:null}) {
    if (rotation.x !== null) {
      this._planeSystem.rotation.x = rotation.x;
    }

    if (rotation.y !== null) {
      this._planeSystem.rotation.y = rotation.y;
    }

    if (rotation.z !== null) {
      this._planeSystem.rotation.z = rotation.z;
    }
  }


  /**
   * Reset the position and rotation of the _planeSystem
   */
  resetPlaneSystem(){
    this._planeSystem.position.x = 0;
    this._planeSystem.position.y = 0;
    this._planeSystem.position.z = 0;
    this._planeSystem.rotation.x = 0;
    this._planeSystem.rotation.y = 0;
    this._planeSystem.rotation.z = 0;
  }


  /**
   * Get the babylonjs scene object, because it's necessary to build textures in Volume
   * @return {BABYLON.Scene} the scene
   */
  getScene () {
    return this._scene;
  }


  /*
  move along the normal of a plane:
  let xyPlane = scene.getMeshByName('xyPlane')
  let xyPlaneNormal = xyPlane.getFacetNormal()
  then, it's signed adn there are 4 facets. The 2 first facets have the same normal
  while the 2 last have normals in the opposite direction. These normals are in world.
   */
}

export { RenderEngine }
