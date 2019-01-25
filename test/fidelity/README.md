# Fidelity Testing

It is very important for any 3D model renderer to strive towards producing a
render that is at once true to the source model, aesthetically pleasing to the
person viewing the render and as consistent as possible with other commonly
used renderers.

To that end, the `<model-viewer>` project is pursuing a line of testing that
compares renders produced by `<model-viewer>` to selected third party reference
model viewers, with an emphasis on revealing major inconsistencies and rendering
errors. The goal of this testing is to improve the quality of `<model-viewer>`
renders over time, as well as to spark discussions with the authors of other
renderers as we seek to achieve a satisfying balance between correctness,
beauty and consistency.

## Reference model viewers

There are a lot of model viewers out there. Since one of the main goals of
`<model-viewer>` is consistency, we will focus on those viewers that have
significant levels of distribution and/or reputation. Current viewers that we
are intend to compare to include:

 - [iOS Quick Look](https://developer.apple.com/arkit/gallery/)
 - [Filament glTF Viewer](https://github.com/google/filament/blob/master/samples/gltf_viewer.cpp)
 - [Khronos glTF Viewer](https://github.com/KhronosGroup/glTF-WebGL-PBR/tree/reference-viewer)

## Capturing reference renders

Currently, reference renders of third party model viewers are captured by hand.
Ideally, this would be an automated process, but there are some challenges such
as:

 - iOS Quick Look is a closed-source binary that only works on real iOS devices
   (not the simulator).
 - Automatically screenshoting Filament requires building the viewer in CI,
   which would add significant latency to our builds.

### iOS Quick Look

iOS Quick Look is the most difficult model viewer to stage, and produces the
most imprecise reference screenshots.

The steps to create a reference screenshot are:

 1. Navigate to this [Glitch](http://lopsided-motion.glitch.me/usdz.html) on an
    iOS device.
      - Currently, we use an iPad Air 2013. You will need to use a device with
        the same display resolution if you wish to update existing tests.
 2. Click the button in the top right of the model you wish to take a screenshot
    of. This will launch Quick Look.
 3. Adjust the model with touch input so that it is staged as desired.
      - Note that`<model-viewer>` does not current support user-configurable
        camera properties.
      - Correct iOS Quick Look staging requires orbiting the camera towards
        the lower pole and zooming-in slightly.
 4. Take a device screenshot.
      - Press the power button and home button at the same time on an iPad Air
        2013
 5. Transfer the device screenshot to a device with Photoshop or equivalent
    and crop the screenshot to a 1536 x 1536 pixel square, with the model
    staged at the center.
 6. Manually compare the new screenshot staging to the staging of the screenshot
    it replaces (if applicable).
      - If screenshots don't line up, repeat steps 3-6 until you get a
        satisfying result.

Note that iOS Quick Look appears to use a slightly narrower field of view than
other viewers, so many screenshots will exhibit hard dissimilarity around the
edges.

### Filament glTF Viewer

Filament glTF Viewer is relatively easy to stage. As of this writing, the
default configuration of Filament's viewer is very similar to the defaults used
in `<model-viewer>`.

The steps to create a reference screenshot are:

 1. Clone the [Filament project repository](https://github.com/google/filament)
 2. Apply [this patch](https://github.com/cdata/filament/commits/model-viewer-adaptation)
    to the repository
 3. Follow the documented steps in the README to produce a build
      - At the time of this writing, this is as easy as invoking
        `./build.sh release` from the repository root
 4. Run the glTF viewer with the appropriate IBL and model as arguments
      - IBLs that we use in tests are included in the patch: [quick_4k](https://github.com/cdata/filament/tree/model-viewer-adaptation/ibl/quick_4k)
      - An example invokation of the glTF viewer from the Filament project root
        looks like: `./out/cmake-release/samples/gltf_viewer -i ./ibl/quick_4k/ $PATH_TO_MODEL`
 5. Take a screenshot of the window that appears (which should be rendering
    the appropriate model)
 6. Crop the screenshot in Photoshop or equivalent to remove window chrome or
    other undesired trim

## Crafting new test scenarios

There is currently a lot of flexibility when it comes to crafting a new fidelity
testing scenario. The critical requirements include:

 - The scenario can be feasibly reproduced in all of the relevant model viewers.
 - The scenario demonstrates render qualities that are not comprehensively
   covered by existing scenarios

As far as `<model-viewer>` is concerned, a scenario is just an HTML file that
incorporates `<model-viewer>` with a given configuration. This HTML file will
be loaded by a browser at test time and used to produce a screenshot for
comparison to any configured reference renders.

The steps to produce a new scenario are:

 1. Acquire or produce a glTF that is representative of what the scenario should
    be testing.
      - If applicable, also produce a corresponding USDZ of that model
 2. Pick a descriptive name for the scenario (for example, `alpha-blend-litmus`)
 3. Create a sub-directory of the [`test/fidelity`](./) folder with the same
    name as your scenario. This will be the scenario's directory.
 4. Add any relevant screenshots of reference viewers to the scenario's
    directory
      - See above in this document for advice on creating reference viewer
        screenshots
 5. Add an `index.html` document containing a configured `<model-viewer>`, and
    with CSS margins removed from the `<body>`.
      - Currently, screenshots are taken in an area measured from the top-left of
        the document, so any margin will most likely lead to undesired results
 6. Modify the configuration at [`test/fidelity/config.json`](./config.json) to
    include an item under `scenarios` that corresponds to your newly created
    scenario
      - Be sure to specify the dimensions of the test, the set of references
        (called "goldens") and the thresholds to test at (0, 1 and 10 are
        recommended).

Note that We have created an environment map that allows us to simulate the iOS
Quick Look skybox in renderers that we wish to appear at least somewhat
comparable to Quick Look: [quick_4k.png](../../examples/assets/quick_4k.png).


