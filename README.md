# xr-model-component

## Notes

* three.js 94dev includes the `WebGLRenderer.prototype.setFramebuffer` function which we need in order to bind WebXR's framebuffer easily. This version is not yet in npm, so a local version is committed in node_modules/three, and some extra rollup work to work around this.
