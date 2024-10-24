# Fidelity Testing

## Crafting new test scenarios

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


On execution, a stringyfied scenario configuration will automatically be attached to `args`, the list of arguments to the `executable`. Please note the additional `outputFile` property.

Example configuration:
```json
{ 
  "scenario": {
    "lighting": "../../../shared-assets/environments/lightroom_14b.hdr",
    "dimensions": {
      "width": 768,
      "height": 450
    },
    "target": {
      "x": 0,
      "y": 0.3,
      "z": 0
    },
    "orbit": {
      "theta": 0,
      "phi": 90,
      "radius": 1
    },
    "verticalFoV": 45,
    "renderSkybox": False,
    "name": "khronos-SheenChair",
    "model": "../../../shared-assets/models/glTF-Sample-Assets/Models/SheenChair/glTF-Binary/SheenChair.glb"
  },
  "outputFile": "./test/goldens/khronos-SheenChair/stellar-golden.png"
}
```
