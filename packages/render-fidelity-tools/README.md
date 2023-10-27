# Render fidelity tools

This package contains tools and testing processes that enable the
`<model-viewer>` project to ensure high-fidelity 3D model rendering as well
as compare its rendering qualities to those of other renderers.

If you are looking for the `<model-viewer>` web component, please refer to the
[`<model-viewer>` package](../model-viewer) and also the live docs and examples
on [modelviewer.dev](https://modelviewer.dev).

## Development

To get started, follow the instructions in [the main README.md file](../../README.md).

In order to run `npm run render-goldens`, you must have `imagemagick` installed.

On macOS, you can install `imagemagick` with homebrew: `brew install imagemagick`

On Debian/Ubuntu/Pop!_OS you can install `imagemagick` with `apt`: `sudo apt install imagemagick`

The following commands are available when developing modelviewer.dev:

Command                         | Description
------------------------------- | -----------
`npm run build`                 | Build artifacts required to run testing and review tools
`npm run clean`                 | Deletes all build artifacts
`npm run test`                  | Run a render fidelity check comparing `<model-viewer>` to other renderers
`npm run render-goldens`        | Render the "golden" images for all renderers

### Fidelity Test CLI

For `npm run test`, we support these command line options:

Command            | Default             | Description
--------------------|----------- | -----------
  -c, --config      |  | Path to configuration json.
  -r, --renderer    | model-viewer | The renderer to fidelity test, must be a web-based renderer.
  -s, --scenario    |  | Limit to specific scenarios. This now also allows you to specify multiple scenarios in the whitelist.  You can use a full name or a partial name of scenarios and it will match against all that contain that scenario substring.
  -p, --port        | 9040  | Port for web server.
  -d, --dry-run      | false | Lists which images would be rendered but doesn't render.  Useful when trying to figure out which tests will run given that command line.
  -q, --quiet        | false | Hide the puppeteer controlled browser.  This can allow you to work on the computer while it is running in the background.

To run a subset of scenarios do something like this:

```
% npm run test -- --scenario=texture --quiet
```

*NOTE: In the above example, the `--` is required to separate the arguments to `npm run test` from the arguments to the script itself.*

After running `npm run test`, you can look at the results by starting a local web server (e.g. `npx http-server`) in this folder, then opening `test/results-viewer.html` in a browser.

### Render Goldens CLI

For `npm run render-goldens`, we support these command line options:

Command            | Default             | Description
--------------------|----------- | -----------
  -c, --config      |  | Path to configuration json.
  -r, --renderer    |  | Limit to specific renderers. This now allows you to specify multiple renderers in the whitelist, rather than only one.
  -s, --scenario    |  | Limit to specific scenarios. This now also allows you to specify multiple scenarios in the whitelist.  You can use a full name or a partial name of scenarios and it will match against all that contain that scenario substring.
  -p, --port        | 9040  | Port for web server.
  -m, --missing-only | false | Only render if an output image is missing.  Very useful when adding new tests.
  -d, --dry-run      | false | Lists which images would be rendered but doesn't render.  Useful when trying to figure out which tests will run given that command line.
  -q, --quiet        | false | Hide the puppeteer controlled browser.  This can allow you to work on the computer while it is running in the background.

To run a subset of renders or scenarios do something like this:

```
% npm run render-goldens -- --renderer=filament --renderer=model-viewer --scenario=clearcoat -q 
```

*NOTE: In the above example, the `--` is required to separate the arguments to `npm run render-goldens` from the arguments to the script itself.*