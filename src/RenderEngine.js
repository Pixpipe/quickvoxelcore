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
    this._emptyTexture3D = this._initEmpty3dTexture()
    this._shaderMaterial = this._initShaderMaterial()
    this._planeSystem = this._initOrthoPlaneSystem()

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
        uniforms: ["world", "worldView", "worldViewProjection", "blendMethod",
          "vol_0_texture3D", "vol_0_transfoMat", "vol_0_timeVal", "vol_0_timeSize", "vol_0_textureReady",
          "vol_1_texture3D", "vol_1_transfoMat", "vol_1_timeVal", "vol_1_timeSize", "vol_1_textureReady"
        ]
      });

    // setting some default values
    shaderMaterial.setInt( "blendMethod", 0 )
    this._initFakeTexture( 0, shaderMaterial )
    this._initFakeTexture( 1, shaderMaterial )

    return shaderMaterial;
  }


  /**
   * Change the blending method. Note that this matters only when 2 textures are displayed
   * @param {Number} m - method of blending
   */
  setBlendMethod (m) {
    this._shaderMaterial.setInt( "blendMethod", m )
  }

  /**
   * Initialize the texture data relative to a single texture
   * @param  {Number} n - 0 for primary, 1 for secondary
   * @param  {BABYLON.ShaderMaterial} shaderMaterial - the shader material to update
   */
  _initFakeTexture (n, shaderMaterial) {
    shaderMaterial.setTexture( "vol_" + n + "_texture3D", this._emptyTexture3D )
    shaderMaterial.setMatrix( "vol_" + n + "_transfoMat", BABYLON.Matrix.Identity() )
    shaderMaterial.setInt( "vol_" + n + "_timeVal", 0 )
    shaderMaterial.setInt( "vol_" + n + "_timeSize", 0 )
    shaderMaterial.setInt( "vol_" + n + "_textureReady", 0 )
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


  /**
   * Mount a volume on the redering engine. This means the 3D texture attached to
   * the given volume will be shown
   * @param  {Number} n - the index of the slot to mount the volume on (most likely 0 or 1)
   * @param  {Volume} volume - the volume to mount
   */
  mountVolumeN (n, volume) {
    if( n>=0 && n < this._mountedVolumes.length ){
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
    if( n>0 && n < this._mountedVolumes.length ){
      this._mountedVolumes[n] = null
      this._initFakeTexture (n, this._shaderMaterial)
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
    if( n>0 && n < this._mountedVolumes.length ){
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
      if( this._mountedVolumes[i].getId() === id )
        return i
    }

    return -1;
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
