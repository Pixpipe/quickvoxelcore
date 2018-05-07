/*
* Author   Jonathan Lurie - http://me.jonathanlurie.fr
* License  MIT
* Link     https://github.com/Pixpipe/quickvoxelcore
* Lab      MCIN - Montreal Neurological Institute
*/

import { Colormap } from 'pixpipe/dist/pixpipe.esmodule.js'
import { RawTexture as BJSRawTexture, Engine as BJSEngine, Texture as BJSTexture} from 'babylonjs/es6.js'


/**
 * An instance of ColormapManager is used by RenderEngine so generate colormaps to apply on the volume.
 * Several types of colormaps are available, they are generated as `pixpipe.Image2D`, from which are made
 * `BABYLON.RawTexture` (2D) and HTML5 `Canvas`. The texture is to be sent to the shader while the canvas
 * can be used for UI purpose. Note that the original `pixpipe.Image2D` colormap is just used temporary
 * and is not kept in memory.
 */
class ColormapManager {

  /**
   * Constructor
   * @param {BABYLON.Scene} scene - the babylonjs scene (necessary to generate textures)
   * @param {Number} [nbSamples=512] - number of samples generated per colormap
   */
  constructor (scene, nbSamples=512) {
    this._scene = scene
    this._nbSamples = nbSamples
    this._colormapTextures = {}
    this._colormapCanvas = {}

    this._createColormapTextures()
    this._defaultColormap = 'greys'
  }


  /**
   * @private
   * Generate BabylonJS textures correcponding to Pixpipe builtin colormaps
   */
  _createColormapTextures () {
    var styles = Colormap.getAvailableStyles()
    var cm = new Colormap()

    for (let i=0; i<styles.length; i++) {
      let name = styles[i]
      cm.setStyle( name )
      cm.buildLut( this._nbSamples )
      let cmImg = cm.createHorizontalLutImage( true )
      cmImg.setMetadata("name", name)


      let cmTexture = new BJSRawTexture(
        // not using getDataAsUInt8Array() here because we dont want to scale on min-max
        new Uint8Array( cmImg.getData() ), // data
        this._nbSamples, // width
        1, // height
        BJSEngine.TEXTUREFORMAT_RGBA, // format
        this._scene, // scene
        false, // gen mipmaps
        false, // invertY
        BJSTexture.TRILINEAR_SAMPLINGMODE,
        BJSEngine.TEXTURETYPE_UNSIGNED_INT
      )

      this._colormapTextures[ name ] = cmTexture
      this._colormapCanvas[ name ] = this._makeCanvasFromColormap( cmImg )
    }
  }


  /**
   * @private
   * Get the colormap of the given name.
   * @param  {String} name - name or the colormap. default: 'default', the greyscale colormap
   * @return {BABYLON.RawTexture} the texture that represent the colormap
   */
  getColormap (name='default') {
    name = (name === 'default') ? this._defaultColormap : name

    if (name in this._colormapTextures) {
      return this._colormapTextures[ name ]
    } else {
      return null
    }
  }


  /**
   * Get a canvas element representing the given colormap.
   * This canvas elem can directly be `append` to some div.
   * @param  {String} [name='default'] - the name of the colormap (default: 'default')
   * @return {Canvas} the Canvas object, of height 1px and width 512px (this depends on the default)
   */
  getColormapCanvas (name='default') {
    name = (name === 'default') ? this._defaultColormap : name
    if (name in this._colormapCanvas) {
      return this._colormapCanvas[ name ]
    } else {
      return null
    }
  }


  /**
   * Get the list of colormap names
   * @return {Array} a list of Strings
   */
  getListOfColormaps () {
    return Object.keys( this._colormapTextures )
  }


  /**
   * @private
   * Prepare a canvas object relative to a Pixpipe Image2D
   * @param  {pixpipe.Image2D} image2D - the colormap as Image2D instance
   * @return {Canvas} HTML5 canvas representing the colormap
   */
  _makeCanvasFromColormap (image2D) {
    // creating a canvas element
    let canvas = document.createElement("canvas")
    canvas.width = image2D.getMetadata('width')
    canvas.height = image2D.getMetadata('height')
    canvas.style = "image-rendering: pixelated;"
    let ctx = canvas.getContext('2d')

    // not sure this is useful since the style is "pixelated"
    // (does not seem to well super well with Firefox)
    ctx.imageSmoothingEnabled = false
    ctx.mozImageSmoothingEnabled = false
    ctx.webkitImageSmoothingEnabled = false
    ctx.ctxmsImageSmoothingEnabled = false

    let canvasImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let canvasImageDataArray = canvasImageData.data
    let originalImageDataArray = image2D.getData()

    for(let i=0; i<originalImageDataArray.length; i++){
      canvasImageDataArray[i] = originalImageDataArray[ i ]
    }

    ctx.putImageData(canvasImageData, 0, 0)
    return canvas
  }

}

export { ColormapManager }
