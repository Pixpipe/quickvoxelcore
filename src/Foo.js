import pixpipe from 'pixpipe';
//import * as BABYLON from 'babylonjs';
//import * as BABYLON from "../node_modules/babylonjs/es6.js";
import * as BABYLON from "babylonjs/es6.js";


/**
 * This class is for Foo
 */
class Foo {

  /**
   * Creates a foo.
   * @param {number} anAttribute - a value.
   * @param {number} aSecondAttribute - another value.
   */
  constructor(anAttribute, aSecondAttribute = 10 ) {
    console.log( pixpipe );
    console.log( BABYLON );

    let canvas = document.getElementById("renderCanvas");

    let engine = new BABYLON.Engine(canvas, true);
    console.log( engine ); 

    this.anAttribute = anAttribute;
    this.aSecondAttribute = aSecondAttribute;
    console.log("a foo is constructed");
  }

  /**
   * Set anAttribute.
   * @param {number} a - the value to give to anAttribute.
   */
  setAnAttribute(a){
    this.anAttribute = a;
    console.log("calling setAnAttribute()");
  }

  /**
   * Display anAttribute.
   */
  printAnAttribute(){
    console.log(this.anAttribute);
  }

  /**
  * @return {number} The anAttribute value.
  */
  getAnAttribute(){
    return this.anAttribute;
  }

}

export { Foo };
