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
- A modern web browser, compatible with WebGL2 (Chrome is ok for some versions)

Quickvoxel Core is backed by [Pixpipe](https://github.com/Pixpipe/pixpipejs) for decoding volume files and process the data, and by [BabylonJS](https://www.babylonjs.com/) for the WebGL2 rendering.

Since this project is a **core only**, it is not bound to any frontend framework and needs to be sugar coated with some UI elements to provide a proper user interaction. You can find a minimal 10-lines example [here](http://www.pixpipe.io/quickvoxelcore/examples/simple.html) ([source](https://github.com/Pixpipe/quickvoxelcore/blob/master/examples/simple.html)).  
A lot of additional methods to do more interesting things with *Quickvoxel* are implemented in the core and need to be tied to UI element to be fully usable. We'll see that in the following part.


# Install
Since **Quickvoxel Core** will most likely be used as a dependency, it can be used in multiple ways:

**From a simple HTML page:**
```HTML
<!-- ES6 version -->
<script src="quickvoxelcore/dist/quickvoxelcore.es6.js"></script>
```

```HTML
<!-- ES5 version -->
<script src="quickvoxelcore/dist/quickvoxelcore.js"></script>
```

**From another ES module:**
```bash
npm install quickvoxelcore
```
Then, from your module:
```Javascript
// import the ES5 version
import quickvoxelcore from 'quickvoxelcore'
```
