import pixpipe from 'pixpipe'
import * as BABYLON from 'babylonjs/es6.js'

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
   * Generate BabylonJS textures correcponding to Pixpipe builtin colormaps
   */
  _createColormapTextures () {
    var styles = pixpipe.Colormap.getAvailableStyles()
    var cm = new pixpipe.Colormap()

    for (let i=0; i<styles.length; i++) {
      let name = styles[i]
      cm.setStyle( name )
      cm.buildLut( this._nbSamples )
      let cmImg = cm.createHorizontalLutImage( true )
      cmImg.setMetadata("name", name)


      let cmTexture = new BABYLON.RawTexture(
        // not using getDataAsUInt8Array() here because we dont want to scale on min-max
        new Uint8Array( cmImg.getData() ), // data
        this._nbSamples, // width
        1, // height
        BABYLON.Engine.TEXTUREFORMAT_RGBA, // format
        this._scene, // scene
        false, // gen mipmaps
        false, // invertY
        BABYLON.Texture.TRILINEAR_SAMPLINGMODE,
        BABYLON.Engine.TEXTURETYPE_UNSIGNED_INT
      )

      this._colormapTextures[ name ] = cmTexture
      this._colormapCanvas[ name ] = this._makeCanvasFromColormap( cmImg )
    }
  }


  /**
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


  getColormapCanvas (name='default') {
    name = (name === 'default') ? this._defaultColormap : name

    if (name in this._colormapCanvas) {
      return this._colormapCanvas[ name ]
    } else {
      return null
    }
  }


  getListOfColormaps () {
    return Object.keys( this._colormapTextures )
  }


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
