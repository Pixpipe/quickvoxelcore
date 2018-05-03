import { UrlToArrayBufferReader, FileToArrayBufferReader, Image3DGenericDecoderAlt } from 'pixpipe/dist/pixpipe.esmodule.js'
//import * as BABYLON from 'babylonjs/es6.js'

import { Volume } from './Volume.js'
import { EventManager } from './EventManager.js'

/**
 * The VolumeCollection is automatically initialized by the constructor of QuickVoxelCore.
 * When the QuickVoxelCore object is created, the VolumeCollection can be fetched to perform actions directly on it.
 *
 * A instance of VolumeCollection manages and identifies Volume instances.
 * A `Volume` can be added to the collection using `.addVolumeFromUrl()` and `.addVolumeFromFile()`.
 * Once one of these two method is called, a `Volume` instance is created (itself generating a 3D texture)
 * and added to the collection with a given index.
 *
 * VolumeCollection provides some events, so that actions can be triggered during the lifecycle of a `Volume`:
 *   - `volumeAdded` is called when the volume is parsed and added to the collection. But its webGL texture is not ready yet! The callbacks attached to this event will have the volume object as argument.
 *   - `volumeReady`called after `volumeAdded`, at the moment the added volume has its WegGL 3D texture ready. At this stage, a volume is ready to be displayed.The callbacks attached to this event will have the volume object as argument.
 *   - `volumeRemoved` is called when a volume is removed from the collection with the method `.removeVolume(id)`. The callbacks attached to this event will have the volume id (string) as argument.
 *   - `errorAddingVolume` is called when a volume failled to be added with `.addVolumeFromUrl()` and `.addVolumeFromFile()`. The callbacks attached to this event will have the url or the HTML5 File object as argument.
 *
 * To each event can be attached multiple callbacks, they will simply be called successivelly in the order the were declared. To assiciate a callback function to an event, just do:
 * ```
 * myVolumeCollection.on("volumeReady", function(volume){
 *    // Do something with this volume
 * })
 * ```
 *
 */
class VolumeCollection extends EventManager {
  /**
   * The constuctor for the VolumeCollection
   */
  constructor () {
    super()
    this._volume = {}

    this._events = {
      volumeAdded: [], // called when the volume is parsed and added to the collection
      volumeReady: [], // called just after "volumeAdded", means the volume has its texture ready
      volumeRemoved: [], // called when a volume is removed from the collection
      errorAddingVolume: [], // called when a volume could not be added to the collection
    };
  }


  /**
   * Get the volume of the given id
   * @param  {String} id - unique id of the volume within the collection
   * @return {Volume|null} the volume if existing, or null if not existing
   */
  getVolume (id) {
    if( id in this._volume ){
      return this._volume[ id ];
    }else{
      return null;
    }
  }


  /**
   * @private
   * Add a new volume to the collection.
   * Once the volume is added to the collection, the even "volumeAdded" is called with the volume in argument
   * @param {Volume} volume - a volumetric object
   */
  _addToCollection (volume) {
    let id = volume.getId()
    this._volume[ id ] = volume;
    this.emit( 'volumeAdded', [volume] );
    this.emit( 'volumeReady', [volume] );
  }


  /**
   * @private
   * Find a non existing name by appending an index to the filename
   * @param  {String} filename - the filename
   * @return {String} the id, which is the filename, possibly appended with a number
   */
  _generateID( filename ){
    // if the name does not already exist, then we just use it
    if( !(filename in this._volume) ){
      return filename;
    }

    // otherwise, we append a number to it
    let i = 0
    while ((filename+"_"+i) in this._volume) {
      i++
    }
    return (filename+"_"+i);
  }


  /**
   * Add a volume file to the collection, using an URL
   * @param {String} url - url of the file
   */
  addVolumeFromUrl (url) {
    let that = this;
    let urlArrBuff =  new UrlToArrayBufferReader();

    urlArrBuff.addInput( url, 0 );

    urlArrBuff.on("ready", function(){
      let arrBuff = this.getOutput();
      let generic3DDecoder = new Image3DGenericDecoderAlt();
      generic3DDecoder.addInput( arrBuff )
      generic3DDecoder.update()
      let img3D = generic3DDecoder.getOutput()

      if( img3D ){
        console.log( img3D );
        let id = that._generateID( urlArrBuff.getMetadata("filenames")[0] );
        let volume = new Volume( id, img3D );
        that._addToCollection( volume )
      }else{
        that.emit( 'errorAddingVolume', [url] );
      }
    });

    urlArrBuff.update()
  }


  /**
   * Add a volume to the collection from a file (most likely using a file dialog)
   * @param {File} file - a compatible volumetric file
   */
  addVolumeFromFile (file) {
    let that = this
    let file2Buff = new FileToArrayBufferReader()
    let filename = file.name

    file2Buff.on("ready", function(){
      let arrBuff = this.getOutput();
      let generic3DDecoder = new Image3DGenericDecoderAlt()
      generic3DDecoder.addInput( arrBuff )
      generic3DDecoder.update()
      let img3D = generic3DDecoder.getOutput()

      if( img3D ){
        console.log( img3D );
        let id = that._generateID( filename )
        let volume = new Volume( id, img3D )
        that._addToCollection( volume )
      }else{
        that.emit( 'errorAddingVolume', file)
      }
    });

    file2Buff.addInput(file)
    file2Buff.update()
  }


  /**
   * Get the list of all volume ids available in this collection
   * @return {[type]} [description]
   */
  getVolumeIds () {
    return Object.keys( this._volume )
  }


  /**
   * Get the `Volume` with the given id
   * @param  {String} id - id of a `Volume` within the collection
   * @return {Volume} the Volume instance with such id, or `null` if not found
   */
  getVolume (id) {
    if( id in this._volume ){
      return this._volume[ id ]
    }else{
      return null;
    }
  }


  /**
   * Remove a volume fron the collection. If succesful, the event "volumeRemoved" is called
   * with the id of the volume in argument
   * @param {String} id - id of the volume to remove
   */
  removeVolume (id) {
    if( id in this._volume ){
      delete this._volume[ id ]
      this.emit( "volumeRemoved", [id] )
    }else{
      console.warn("The volume " + id + " cannot be removed because it does not exist.");
    }
  }

} // END of class VolumeCollection

export { VolumeCollection }
