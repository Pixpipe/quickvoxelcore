import pixpipe from 'pixpipe'
//import * as BABYLON from 'babylonjs/es6.js'

import { Volume } from './Volume.js'

/**
 * A instance of VolumeCollection manages and identifies Volume instances
 */
class VolumeCollection {
  /**
   * The constuctor for the VolumeCollection
   */
  constructor () {
    this._volume = {}

    this._events = {
      volumeAdded: null,
      volumeRemoved: null,
      errorAddingVolume: null,
    };
  }


  /**
   * Define the callback attached to an event
   * @param  {String} eventName - the name of the event, must exist in this._events (with the value null)
   * @param  {Function} callback - the function associated to this event
   */
  on (eventName, callback) {
    if( (typeof callback === "function") && (eventName in this._events) ){
      this._events[ eventName ] = callback;
    }
  }


  /**
   * Call an event by invoking its name and providing some arguments.
   * This methods should be used internally rather than using wild calls.
   * @param  {String} eventName - the name of the event, must exist in this._events (with the value null)
   * @param  {Array} args - array of arguments, to be spread when callback is called
   */
  _callEvent (eventName, args=[]) {
    // the event must exist and be non null
    if( (eventName in this._events) && (this._events[eventName]) )
      this._events[ eventName ](...args);
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
   * Add a new volume to the collection.
   * Once the volume is added to the collection, the even "volumeAdded" is called with the volume in argument
   * @param {Volume} volume - a volumetric object
   */
  _addToCollection (volume) {
    let id = volume.
    this._volume[ id ] = volume;
    this._callEvent( 'volumeAdded', [volume] );
  }


  /**
   * Find a non existing name by appending an index to the filename
   * @param  {[type]} filename [description]
   * @return {[type]}          [description]
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
    let urlArrBuff =  new pixpipe.UrlToArrayBufferReader();

    urlArrBuff.addInput( url, 0 );

    urlArrBuff.on("ready", function(){
      let arrBuff = this.getOutput();
      let generic3DDecoder = new pixpipe.Image3DGenericDecoderAlt();
      let img3D = generic3DDecoder.getOutput();

      if( img3D ){
        let id = that._generateID( urlArrBuff.getMetadata("filenames")[0] );
        let volume = new Volume( id, img3D );
        that._addToCollection( volume );
      }else{
        this._callEvent( 'errorAddingVolume', [url] );
      }
    });
  }


  /**
   * Get the list of all volume ids available in this collection
   * @return {[type]} [description]
   */
  getVolumeIds () {
    return Object.keys( this._volume );
  }


  /**
   * [getVolume description]
   * @param  {[type]} id [description]
   * @return {[type]}    [description]
   */
  getVolume (id) {
    if( id in this._volume ){
      return this._volume[ id ];
    }else{
      return null;
    }
  }

} // END of class VolumeCollection

export { VolumeCollection }
