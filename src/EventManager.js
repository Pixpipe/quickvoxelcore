/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/quickvoxelcore
* Lab      MCIN - Montreal Neurological Institute
*/
*

/**
 * The EventManager deals with events, create them, call them.
 * This class is mostly for being inherited from.
 */
class EventManager {
  /**
   * Constructor
   */
  constructor () {
    this._events = {}
  }


  /**
   * Define an event, with a name associated with a function
   * @param  {String} eventName - Name to give to the event
   * @param  {Function} callback - function associated to the even
   */
  on (eventName, callback) {
    if( typeof callback === "function" ){
      if (!(eventName in this._events)) {
        this._events[ eventName ] = []
      }
      this._events[ eventName ].push( callback )
    } else {
      console.warn('The callback must be of type Function')
    }
  }


  emit (eventName, args=[]) {
    // the event must exist and be non null
    if( (eventName in this._events) && (this._events[eventName].length>0) ){
      let events = this._events[ eventName ]
      for (let i=0; i<events.length; i++) {
        events[i](...args)
      }
    } else {
      console.warn('No function associated to the event ' + eventName )
    }
  }


}

export { EventManager }
