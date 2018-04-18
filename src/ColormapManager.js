import pixpipe from 'pixpipe'

class ColormapManager {

  /**
   * Constructor
   * @param {Number} [nbSamples=512] - number of samples generated per colormap
   */
  constructor (nbSamples=512) {
    this._nbSamples = nbSamples
    this._colormaps = {}
  }

  _initAll () {
    var styles = pixpipe.Colormap.getAvailableStyles()
    var cm = new pixpipe.Colormap()

    for (let i=0; i<styles.length; i++) {
      cm.setStyle( styles[i] )
      cm.buildLut( this._nbSamples )
      let cmImg = cm.createHorizontalLutImage( false );

      // TODO extract the .data and build a BABYLON texture 2D
    }

  }

}

export { ColormapManager }
