import { RenderEngine } from './RenderEngine.js'
import { VolumeCollection } from './VolumeCollection.js'

/**
 * [QuickvoxelCore description]
 */
class QuickvoxelCore {
  /**
   * [constructor description]
   */
  constructor ( canvasElem ) {
    this._renderEngine = new RenderEngine( canvasElem );
    this._volumeCollection = new VolumeCollection;

    this._initEvents();
  }


  /**
   * Initialize events
   */
  _initEvents () {
    let that = this;

    // when a volume is loaded as a Pixpipe Image3DAlt, then we want to
    // make a BABYLON texture3D from it.
    this._volumeCollection.on('volumeAdded', function( volume ){
      console.log(`Building texture3D vor volume ${volume.getId()}`);
      volume.buildTexture( that._renderEngine.getScene() );


      // TODO: send texture and matrix to the RenderEngine, but maybe just call an event to say it's ready and have another function dedicated to send texture+matrix to shader
    })

    // just display a fail message
    this._volumeCollection.on('errorAddingVolume', function( url ){
      console.warn(`The volume at ${url} could not be loaded`);
    })

  }


  /**
   * Get the volume collection, to access to some features such as adding a volume
   * @return {[type]} [description]
   */
  getVolumeCollection () {
    return this._volumeCollection;
  }


  /**
   * Get the rendering engine to perform some 3D tasks, such as interacting with the view
   * @return {[type]} [description]
   */
  getRenderEngine () {
    return this._renderEngine;
  }


}

export { QuickvoxelCore }
