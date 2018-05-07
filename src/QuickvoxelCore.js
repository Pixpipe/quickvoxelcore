/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/quickvoxelcore
* Lab      MCIN - Montreal Neurological Institute
*/


import { RenderEngine } from './RenderEngine.js'
import { VolumeCollection } from './VolumeCollection.js'
import { CameraCrew } from './CameraCrew.js'

/**
 * Build an instance of QuickvoxelCore to initialize Quickvoxel Core.
 * Once constructed, the methods `.getVolumeCollection()` and `.getRenderEngine()`
 * can be called to provide more features.
 */
class QuickvoxelCore {
  /**
   * Constructor of the entry point of Quickvoxel Core.
   * This is probably the only constructor of the project to be called.
   * Takes a canvas element (DOM object) as argument to render the volumes.
   */
  constructor ( canvasElem ) {
    this._renderEngine = new RenderEngine( canvasElem )
    this._cameraCrew = new CameraCrew( this._renderEngine, canvasElem )
    this._volumeCollection = new VolumeCollection()

    this._initEvents();
  }


  /**
   * @private
   * Initialize events
   */
  _initEvents () {
    let that = this;

    // when a volume is loaded as a Pixpipe Image3DAlt, then we want to
    // make a BABYLON texture3D from it.
    this._volumeCollection.on('volumeAdded', function( volume ){
      console.log(`Volume ${volume.getId()} added to collection. Now building 3D texture.`);
      volume.buildTexture( that._renderEngine.getScene() );
    })

    // just display a fail message
    this._volumeCollection.on('errorAddingVolume', function( url ){
      console.warn(`The volume at ${url} could not be loaded`);
    })


    // A volume is removed from the collection --> make sure it no longer shows in the render engine
    this._volumeCollection.on('volumeRemoved', function( id ){
      console.log(`Volume ${id} removed from collection.`);
      let mountedIndex = that.unmountVolumeWithId( id );
      if (mountedIndex >= 0)
        console.log("+ removed from the render engine.");
    })

  }


  /**
   * Get the volume collection, to access to some features such as adding/removing a volume
   * @return {VolumeCollection}
   */
  getVolumeCollection () {
    return this._volumeCollection;
  }


  /**
   * Get the rendering engine to perform some 3D tasks, such as interacting with the view
   * @return {RenderingEngine}
   */
  getRenderEngine () {
    return this._renderEngine;
  }


  /**
   * Get the CameraCrew instance in order to perform some camera manipulations
   * @return {CameraCrew}
   */
  getCameraCrew () {
    return this._cameraCrew
  }


  /**
   * Mount the volume of the given id on the slot with the given index on the rendering engine
   * @param  {Number} n - the slot index
   * @param  {String} volumeId - the id of the volume within the collection
   */
  mountVolumeOnSlotN (n, volumeId) {
    let volume = this._volumeCollection.getVolume( volumeId );
    if (volume) {
      this._renderEngine.mountVolumeN( n, volume )
    }else{
      console.warn("The volume " + volumeId + " does not exist");
    }
  }


  /**
   * Unmount the volume from the slot n in the rendering engine.
   * Note: this method is jsut a call to the rendering engine, since the volume
   * itself is not needed to be unmounted.
   * @param  {[type]} n [description]
   * @return {[type]}   [description]
   */
  unmountVolumeFromSlotN (n) {
    this._renderEngine.unmountVolumeN( n )
  }


  /**
   * [unmountVolumeWIthId description]
   * @param  {[type]} id [description]
   * @return {[type]}    [description]
   */
  unmountVolumeWithId (id) {
    let mountedIndex = this._renderEngine.getSlotIndexFromVolumeId( id )
    if( mountedIndex >= 0){
      this._renderEngine.unmountVolumeN( mountedIndex )
    }
    return mountedIndex;
  }


}

export { QuickvoxelCore }
