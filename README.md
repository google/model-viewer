# xr-model-component

## TODOs

* The DOM view is using post processing, but due to [WebGLRenderTargets not supporting antialiasing](https://github.com/mrdoob/three.js/issues/568), we get aliasing. Perhaps there are other solutions.
* three.js 94dev includes the `WebGLRenderer.prototype.setFramebuffer` function which we need in order to bind WebXR's framebuffer easily. This version is not yet in npm, so a local version is committed in node_modules/three, and some extra rollup work to work around this. Upgrade to r94 once its on npm. Currently an `npm install` blows this away (???). Non-ideal.
* There is currently no way to tell whether an iOS device has AR Quick Look support. Possibly check for other features added in Safari iOS 12 (like CSS font-display): https://css-tricks.com/font-display-masses/
* Since there are no USDZ three.js loaders (and seems that it'd be difficult to do), Safari iOS users would either need to load a poster image, or if they load the 3D model content before entering AR, they'd download both glTF and USDZ formats, which are already generally rather large.
* With native AR Quick Look, the entire image triggers an intent to the AR Quick Look. Currently in this component implementation, the user must click the AR button. Unclear if we want to change this, as interacting and moving the model could cause an AR Quick Look trigger.
* The size of the AR Quick Look native button scales to some extent based off of the wrapper. We could attempt to mimic this, or leverage the native rendering possibly with a transparent base64 image.
* I'm sure there's some race conditions if quickly toggling states between DOM and AR views.
