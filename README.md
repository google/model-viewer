# The `<model-viewer>` project

This is the main Github repository for the `<model-viewer>` web component and
all of its related projects.

**Getting started?** Check out the [`<model-viewer>`](packages/model-viewer) project!

The repository is organized into sub-directories containing the various projects.
Check out the README.md files for specific projects to get more details:

👩‍🚀 **[`<model-viewer>`](packages/model-viewer)** • The `<model-viewer>` web component (probably what you are looking for)

✨ **[`<model-viewer-effects>`](packages/model-viewer-effects)** • The PostProcessing plugin for `<model-viewer>`

🌐 **[modelviewer.dev](packages/modelviewer.dev)** • The source for the `<model-viewer>` documentation website

🖼 **[render-fidelity-tools](packages/render-fidelity-tools)** • Tools for testing how well `<model-viewer>` renders models

🎨 **[shared-assets](packages/shared-assets)** • 3D models, environment maps and other assets shared across many sub-projects

🚀 **[space-opera](packages/space-opera/)** • The source of the `<model-viewer>` [editor](https://modelviewer.dev/editor/)

## Development

When developing across all the projects in this repository, first install git,
Node.js and npm.

Then, perform the following steps to get set up for development:

```sh
git clone --depth=1 git@github.com:google/model-viewer.git
cd model-viewer
npm install
```

Note: depth=1 keeps you from downloading our ~3Gb of history, which is dominated by all the versions of our golden render fidelity images.

The following global commands are available:

Command                        | Description
------------------------------ | -----------
`npm ci`                       | Install dependencies and cross-links sub-projects
`npm run build`                | Runs the build step for all sub-projects
`npm run serve`                | Runs a web server and opens a new browser tab pointed to the local copy of modelviewer.dev (don't forget to build!)
`npm run test`                 | Runs tests in all sub-projects that have them
`npm run clean`                | Removes built artifacts from all sub-projects

You should now be ready to work on any of the `<model-viewer>` projects!

## Windows 10/11 Setup
Due to dependency issues on Windows 10 we recommend running `<model-viewer>` setup from a WSL2 environment.
 * [WSL2 Install walkthrough](https://docs.microsoft.com/en-us/windows/wsl/install-win10)

And installing Node.js & npm via NVM
 * [Node.js/NVM install walkthrough](https://docs.microsoft.com/en-us/windows/nodejs/setup-on-wsl2)

You should clone model-viewer from _inside_ WSL, not from inside Windows. Otherwise, you might run into line endings and symlink issues.  
To clone via HTTPS in WSL (there are known file permissions issues with SSH keys inside WSL):  
```
git clone --depth=1 https://github.com/google/model-viewer.git
cd model-viewer
npm install
```

To run tests in WSL, you need to bind `CHROME_BIN`:
```
export CHROME_BIN="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
npm run test
```

Note that you should be able to run the `packages/model-viewer` and `packages/model-viewer-effects` tests with that setup, but running fidelity tests requires GUI support which is only available in WSL on Windows 11.  

<details>
 <summary>Additional WSL Troubleshooting – provided for reference only</summary>
 
> These issues should not happen when you have followed the above WSL setup steps (clone via HTTPS, clone from inside WSL, bind CHROME_BIN). The notes here might be helpful if you're trying to develop model-viewer from inside Windows (not WSL) instead (not recommended).  

### Running Tests
Running `npm run test` requires an environment variable on WSL that points to `CHROME_BIN`.
You can set that via this command (this is the default Chrome install directory, might be somewhere else on your machine)
```
export CHROME_BIN="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
npm run test
```

Tests in `packages/model-viewer` and `packages/model-viewer-effects` should now run properly; fidelity tests might still fail (see errors and potential workarounds below).

### Error: `/bin/bash^M: bad interpreter: No such file or directory`
**Symptom**
Running a .sh script, for example  `fetch-khronos-gltf-samples.sh`, throws an error message `/bin/bash^M: bad interpreter: No such file or directory`

Alternative error:  
```
! was unexpected at this time.
npm ERR! code ELIFECYCLE
npm ERR! errno 1
npm ERR! @google/model-viewer@1.10.1 prepare: `if [ ! -L './shared-assets' ]; then ln -s ../shared-assets ./shared-assets; fi && ../shared-assets/scripts/fetch-khronos-gltf-samples.sh`
```

**Solution**
This is caused by incorrect line endings in some of the .sh files due to git changing these on checkout on Windows (not inside WSL). It's recommended to clone the model-viewer repository from a WSL session.  

As a workaround, you can re-write line endings using the following command:  
```
sed -i -e 's/\r$//' ../shared-assets/scripts/fetch-khronos-gltf-samples.sh
```

### Error: `ERROR:browser_main_loop.cc(1409)] Unable to open X display.`
**Symptom**
When trying to `npm run test`, errors are logged similar to:
```
❌Fail to analyze scenario :khronos-IridescentDishWithOlives! Error message: ❌ Failed to capture model-viewer's screenshot
[836:836:0301/095227.204808:ERROR:browser_main_loop.cc(1409)] Unable to open X display.
```
Pupeteer tests need a display output; this means GUI support for WSL is required which seems to only be (easily) available on Windows 11, not Windows 10.  
https://docs.microsoft.com/de-de/windows/wsl/tutorials/gui-apps#install-support-for-linux-gui-apps

So, the workaround seems to be running Windows 11 (but not tested yet).

### Error: `ERROR: Task not found: "'watch:tsc"`
**Symptom**
Running `npm run dev` in `packages/model-viewer` on Windows throws error `ERROR: Task not found: "'watch:tsc"`.

**Solution**
(if you have one please make a PR!)

</details>