# Render fidelity tools

This package contains tools and testing processes that enable the
`<model-viewer>` project to ensure high-fidelity 3D model rendering as well
as compare its rendering qualities to those of other renderers.

If you are looking for the `<model-viewer>` web component, please refer to the
[`<model-viewer>` package](../model-viewer) and also the live docs and examples
on [modelviewer.dev](https://modelviewer.dev).

## Development

To get started, follow the instructions in [the main README.md file](../../README.md).

The following commands are available when developing modelviewer.dev:

Command                         | Description
------------------------------- | -----------
`npm run build`                 | Build artifacts required to run testing and review tools
`npm run clean`                 | Deletes all build artifacts
`npm run test`                  | Run a render fidelity check comparing `<model-viewer>` to other renderers
`npm run update-screenshots`    | Update the "golden" screenshots for all renderers