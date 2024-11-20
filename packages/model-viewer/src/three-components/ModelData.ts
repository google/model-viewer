import {Object3D} from 'three';

/**
 * A THREE.Scene object that takes a Model and CanvasHTMLElement and
 * constructs a framed scene based off of the canvas dimensions.
 * Provides lights and cameras to be used in a renderer.
 */
export class ModelData extends Object3D {
// ModelScene is going to have child of this types
public url: string|null = null;

constructor(url: string) {
    super();
    this.url = url;
    console.log("Testing new setup");
    console.log("ModelData constructor is called");
}
}