![](./assets/images/qv_logo_horizontal.png)

**Quickvoxel Core** is a pure Javascript toolkit for volumetric visualization of neuro files in the web browser. Everything that happens in Quickvoxel is strictly client-side, without the need of an active server (i.e. can run on a Github page)

Features:
- Open and decodes **NIfTI**, **MINC2**, and **MGH** (experimental)
- Display volume in world/subject coordinates to align registered volumes
- **Obliques**
- Can **blend** two volumes with different methods
- Apply **colormaps**  ([44 available](http://www.pixpipe.io/pixpipejs/examples/colormap.html))
- Adjust **contrast** and **brightness**

Requirement:
- A modern web browser, compatible with WebGL2 (recent Chrome or Firefox)

Quickvoxel Core is backed by [Pixpipe](https://github.com/Pixpipe/pixpipejs) for decoding volume files and process the data, and by [BabylonJS](https://www.babylonjs.com/) for the WebGL2 rendering.

Since this project is a **core only**, it is not bound to any frontend framework and needs to be sugar coated with some UI elements to provide a proper user interaction. You can find a minimal 10-lines example [here](http://www.pixpipe.io/quickvoxelcore/examples/simple.html) ([source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/simple.html)).  
A lot of additional methods to do more interesting things with *Quickvoxel* are implemented in the core and need to be tied to UI element to be fully usable. We'll see that in the following part.

# Demo
(Most of the demos are less than 20 lines)
- [Simple with loading from URL](http://www.pixpipe.io/quickvoxelcore/examples/simple.html) - [source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/simple.html)
- [Simple with loading from a local file](http://www.pixpipe.io/quickvoxelcore/examples/simpleFile.html) - [source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/simpleFile.html)
- [Translate the plane](http://www.pixpipe.io/quickvoxelcore/examples/translate.html) - [source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/translate.html)
- [Oblique plane](http://www.pixpipe.io/quickvoxelcore/examples/oblique.html) - [source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/oblique.html)
- [With colormaps](http://www.pixpipe.io/quickvoxelcore/examples/colormaps.html) - [source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/colormaps.html)
- [Oblique plane, animated](http://www.pixpipe.io/quickvoxelcore/examples/oblique2.html) - [source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/oblique2.html)
- [Two volumes + blending + colormap](http://www.pixpipe.io/quickvoxelcore/examples/double.html) - [source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/double.html)
- [+ time series animated](http://www.pixpipe.io/quickvoxelcore/examples/time.html) - [source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/time.html)
- [+ animated translation](http://www.pixpipe.io/quickvoxelcore/examples/doubleTranslate.html) - [source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/doubleTranslate.html)
- [+ animated oblique](http://www.pixpipe.io/quickvoxelcore/examples/doubleRotate.html) - [source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/doubleRotate.html)


# API documentation
[HERE](http://www.pixpipe.io/quickvoxelcore/doc/)


# Install
Since **Quickvoxel Core** will most likely be used as a dependency, it can be used in multiple ways:

**From a simple HTML page:**
```html
<!-- ES6 version -->
<script src="quickvoxelcore/dist/quickvoxelcore.es6.js"></script>

<!-- or ES5 version -->
<script src="quickvoxelcore/dist/quickvoxelcore.js"></script>

<!-- or ES5 minified version -->
<script src="quickvoxelcore/dist/quickvoxelcore.min.js"></script>
```

**From another ES module:**
```bash
npm install quickvoxelcore --save
```

Then, from your module:
```javascript
// import the ES5 version
import quickvoxelcore from 'quickvoxelcore'

// or import the ES6 version
import quickvoxelcore from 'quickvoxelcore/dist/quickvoxelcore.es6.js'
```

# How To
## Getting started
To start, *QuickvoxelCore* needs an HTML5 canvas element:
```html
<html>
<head>
  <title>QuickvoxelCore Test</title>

  <style>
  body {
    overflow: hidden;
    width: 100%;
    height: 100%;
    margin: 0;
  }

  #renderCanvas {
    width: 100%;
    height: 100%;
  }
  </style>

</head>
<body>
  <script src="../dist/quickvoxelcore.es6.js"></script>

  <canvas id="renderCanvas"></canvas>

  <script>
    let canvas = document.getElementById("renderCanvas")
    // ...
  </script>

</body>
</html>
```

No matter the way you pick (simple HTML page or ES module to be bundled), the features are accessible from the `quickvoxelcore` namespace:
```javascript
let canvas = document.getElementById("renderCanvas")

let qvc = new quickvoxelcore.QuickvoxelCore( canvas )
```

The constructor `quickvoxelcore.QuickvoxelCore(...)` initializes several internal objects, two important ones can be fetched: the `VolumeCollection` and the `RenderEngine`:

```javascript
// ...

let qvc = new quickvoxelcore.QuickvoxelCore( canvas )

let volumeCollection = qvc.getVolumeCollection()
let renderEngine = qvc.getRenderEngine()
```

Though, before launching your main app, if can be nice to check if QuickvoxelCore is running in a WebGL2 compatible environment. We have a function for that:
```javascript
// test compatibility with WebGL2
if (!quickvoxelcore.webGL2()){
  alert( 'Quickvoxel Core cannot run here because this web browser is not compatible with WebGL2.' )
} else {
  // launch your app here
}
```

## Interlude: the VolumeCollection
The `VolumeCollection` instance allows you to add new volume from file URL or from a file dialog. Once added, a volume file will automatically:
- be given a unique ID within the collection
- be parsed by Pixpipe
- create a 3D texture for later display

The methods you will use from your `VolumeCollection` instance are:
- `.addVolumeFromUrl( String )` to add a volume from a URL
- `.addVolumeFromFile( File)` to add a volume from a file in the local filesystem

In addition, `VolumeCollection` provides some events so that actions can be triggered during the lifecycle of a `Volume`:
- `volumeAdded` is called when the volume is parsed and added to the collection. But its webGL texture is not ready yet! The callbacks attached to this event will have the volume object as argument.
- `volumeReady`called after `volumeAdded`, at the moment the added volume has its WegGL 3D texture ready. At this stage, a volume is ready to be displayed.The callbacks attached to this event will have the volume object as argument.
- `volumeRemoved` is called when a volume is removed from the collection with the method `.removeVolume(id)`. The callbacks attached to this event will have the volume id (string) as argument.
- `errorAddingVolume` is called when a volume failed to be added with `.addVolumeFromUrl()` and `.addVolumeFromFile()`. The callbacks attached to this event will have the url or the HTML5 File object as argument.

To each event can be attached multiple callbacks, they will simply be called successively in the order the were declared. To associate a callback function to an event, just do:

```javascript
myVolumeCollection.on("volumeReady", function(volume){
    // Do something with this volume
})
```
In general, events are most likely to be defined from the main scope or from where you also have access to the `RenderEngine` instance.

## Interlude: the RenderEngine
The `RenderEngine` instance is in charge of displaying the volume from the collection, once they are loaded. It also comes with all the features to rotates/translates the three orthogonal planes (referred as `_planeSystem` in the source), apply a colormaps, change brightness/contrast and deal with blending.

A `RenderEngine` can display only 2 volumes at the same time. The terminology used in the doc and source is
> Two **slots** are available to **mount** volumes on the render engine. Those slots are called **primary** and **secondary**.

Then, some volume can be *unmounted* from a given slot and another volume from the volume collection can be *mounted*.

Rendering features such as **colormap**, **contrast** and **brightness** are associated to *slots* and not to *volumes*. This means, if you use the *primary* slot to mount a structural MRI and the *secondary* slot to mount a functional MRI, and then adjust the brightness/contrast/colormap of the secondary slot, mounting another fMRI instead of the one in place will not change those settings.

*Note: there are plans to add a additional volume for masking*

## Mount a volume once it's ready
Here is how to load a volume from a URL (that has to comply with CORS, i.e. be in the same server as Quickvoxel)

```javascript
// ...

volumeCollection.addVolumeFromUrl( "./data/structural.nii.gz" );

// mount the volume when it's ready!
volumeCollection.on("volumeReady", function(volume){
  // to mount the loaded volume on a specific engine slot.
  // (if a volume is already on this slot, it's unmounted and replaced by the new one)
  renderEngine.mountVolumeN( 0, volume )

  // OR, you can just mount it on the first slot available
  let couldMount = renderEngine.mountVolumeOnFirstEmptySlot( volume )

  if( !couldMount ){
    console.log("All volume slots are taken on the render engine, make some space before rendering this volume.");
  }
})

```

Alternatively, a volume can be loaded from you filesystem using a file dialog. Look at the [example here](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/simpleFile.html). Then, the logic for mounting on a slot is the same.


# Going Further
The `RenderEngine` object has a lot of methods that can be used to tweak your visualization. Do no hesitate to consult the [API doc conserning the RenderEngine](http://www.pixpipe.io/quickvoxelcore/doc/#renderengine) to make sure you use them properly.  

Here is a list of what you can do:
- show/hide a volume mounted on a slot
- change the blending method between two volumes
- mount/unmount a volume on/from a given slot
- apply a colormap on a given slot
- get the list of colormaps names and corresponding canvas for UI purpose
- display a reversed colormap
- change the brightness on a given slot
- change the contrast on a given slot
- change the time index of a volume on a given slot (time series)
- rotate with a relative angle around the normal of a plane from the plane system (1 plane remains fixed)
- translate along the normal of a plane from the plane system
- apply an absolute rotation in world coordinates Euler angles
- set the position of the plane system in absolute world coordinates
- [experimental] change the position of the camera (incomplete, `up` vector needs to be set too)


# TODO
In what is probably the order of future developments:
- [ ] Add method to automatically position the main (perspective) camera along the *dominant* X Y or Z
- [ ] Add a method to force the main (perspective) camera to follow the center of the plane system
- [ ] Add XYZ axis of a grid system to know where we are
- [ ] Masking capabilities (as a 3rd slot that has special features)
- [ ] Raycasting capabilities, then we can get the position where the mouse pointer is hitting (and then the intensity in the volume, etc)
- [ ] Try to build 3D textures without having to perform a conversion from float32 to uint8
- [ ] Add 3 cameras that are always facing each of the ortho planes
- [ ] Gives the possibility to change the camera
- [ ] Have a split view options with the 4 camera (3 orthos + 1 perspective)
- [x] Check if WebGL2 is enabled
