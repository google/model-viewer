# The `<model-viewer>` project

This is the main Github repository for the `<model-viewer>` web component and
all of its related projects.

**Getting started?** Check out the [`<model-viewer>`](packages/model-viewer) project!

The repository is organized into sub-directories containing the various projects.
Check out the README.md files for specific projects to get more details:

👩‍🚀 **[`<model-viewer>`](packages/model-viewer)** • The `<model-viewer>` web component (probably what you are looking for)

🌐 **[modelviewer.dev](packages/modelviewer.dev)** • The source for the `<model-viewer>` documentation website

🖼 **[render-fidelity-tools](packages/render-fidelity-tools)** • Tools for testing how well `<model-viewer>` renders models

🎨 **[shared-assets](packages/shared-assets)** • 3D models, environment maps and other assets shared across many sub-projects

## Development

When developing across all the projects in this repository, first install git,
Node.js and npm.
*(npm version 6.14 is recommended due compatibility issues with version 7)*

Then, perform the following steps to get set up for development:

```sh
git clone --depth=1 git@github.com:google/model-viewer.git
cd model-viewer
npm install
npm run bootstrap
```

Note: depth=1 keeps you from downloading our ~3Gb of history, which is dominated by all the versions of our golden render fidelity images.

The following global commands are available:

Command                        | Description
------------------------------ | -----------
`npm run bootstrap`            | Bootstraps the project for development and cross-links sub-projects
`npm run build`                | Runs the build step for all sub-projects
`npm run serve`                | Runs a web server and opens a new browser tab pointed to the local copy of modelviewer.dev (don't forget to build!)
`npm run test`                 | Runs tests in all sub-projects that have them
`npm run clean`                | Removes built artifacts from all sub-projects

You should now be ready to work on any of the `<model-viewer>` projects!

## Windows 10 Setup
Due to dependency issues on Windows 10 we recommend running `<model-viewer>` setup from a WSL2 environment.
 * [WSL2 Install walkthrough](https://docs.microsoft.com/en-us/windows/wsl/install-win10)

And installing Node.js & npm via NVM (*npm version 6.14 is recommended*)
 * [Node.js/NVM install walkthrough](https://docs.microsoft.com/en-us/windows/nodejs/setup-on-wsl2)
