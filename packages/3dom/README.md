# 3DOM 

3DOM is a library that makes it easy to run custom, possibly-untrusted scripts
that manipulate a scene graph. 3DOM invokes scripts in a worker, and 3DOM
scripts act on a normalized scene graph API designed in the image of the glTF
file format.

3DOM is designed to be implemented for multiple 3D libraries. To support 
this goal, it uses a facade pattern that can be adapted for different backing
APIs. Currently, only Three.js is has an implementation, but we hope to include
more facades in the future.

Although 3DOM was designed to support `<mnodel-viewer>`, you can use 3DOM with
any Three.js scene.

## Implementation example

There are two important constructs to consider when implementing 3DOM:

 - The graft: a facade that wraps over your Three.js scene
 - The execution context: makes it easy to evaluate script in a scene graph worker

The following example applies 3DOM to a Three.js scene graph and invokes script
to operate on the scene graph from a worker:

```javascript
import {ThreeDOMExecutionContext} from '@google/3dom/lib/context.js';
import {ModelGraft} from '@google/3dom/lib/facade/three-js/model-graft.js';

import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

const gltfLoader = new GLTFLoader();
const modelUrl = './Astronaut.glb';

gltfLoader.load(modelUrl, (gltf) => {
  const executionContext =
      new ThreeDOMExecutionContext(['material-properties']);

  const graft = new ModelGraft(modelUrl, gltf);

  executionContext.changeModel(graft);

  executionContext.eval(`
console.log('Hello from a 3DOM worker!');

// Manipulate the scene graph:
model.materials[0].pbrMetallicRoughness.setBaseColorFactor([1, 0, 0, 1]);`);
});
```

## Development

To get started, follow the instructions in [the main README.md file](../../README.md).

The following commands are available when developing `<model-viewer>`:

Command                         | Description
------------------------------- | -----------
`npm run build`                 | Builds all 3DOM distributable files
`npm run test`                  | Run 3DOM unit tests
`npm run watch:test`            | Run unit tests via Karma in "watch" mode
`npm run serve`                 | Starts a web server and opens the demo
`npm run clean`                 | Deletes all build artifacts
`npm run dev`                   | Starts `tsc` and Karma in "watch" mode, and starts a web server pointing to the demo
`npm run update:package-lock`   | Regenerates package-lock.json; do this when adding or removing dependencies

