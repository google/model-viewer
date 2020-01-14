# The `<model-viewer>` project

This is the main Github repository for the `<model-viewer>` web component and
all of its related projects.

The repository is organized into sub-directories containing the various projects.
Check out the README.md files for specific projects to get more details:

 - [`<model-viewer>`](packages/model-viewer)

### Development

When developing across all the projects in this repository, perform the following
steps to bootstrap the environment correctly:

```sh
git clone git@github.com:GoogleWebComponents/model-viewer.git
cd model-viewer
npm install
./node_modules/.bin/lerna bootstrap
```

You should now be ready to work on any of the `<model-viewer>` projects!