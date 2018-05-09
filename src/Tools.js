/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/quickvoxelcore
* Lab      MCIN - Montreal Neurological Institute
*/


/**
 * Know if the current environment is webGL2 compatible.
 * Usage:
 * ```Javascript
 * if (!quickvoxelcore.webGL2()){
 *   alert( 'Quickvoxel Core cannot run here because this web browser is not compatible with WebGL2.' )
 * } else {
 *   // call the main app
 * }
 * ```
 * @return {Boolean} true if compatible with WebGL2, false if not
 */
export function webGL2 () {
  var dummyGL = document.createElement("canvas").getContext("webgl2")
  return !!dummyGL;
}


/**
 * Gives the property name in the object that has the given value
 * @param  {Object} object - an object that may contain a property associated with a specific value
 * @param  {Object} value - a value to look for
 * @return {String} Name of the first property that has the given value. Or null if not found
 */
export function getKeyFromValue (object, value) {
  for (let key in object) {
    if (object[key] === value)
      return key
  }
  return null
}
