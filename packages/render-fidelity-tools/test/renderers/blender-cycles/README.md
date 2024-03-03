# Blender Cycles

## Requirements

- Install blender and add to `path` [Launching from command line docs](https://docs.blender.org/manual/en/latest/advanced/command_line/launch/index.html#command-line-launch-index)

## The command

example command to render ClearCoatCarPaint model
`npm run render-goldens -- --renderer=blender-cycles --scenario=ClearCoatCarPaint -q`

Note: there might be a _npm ERR_ after the code runs , but the image should be generated successfully

**Internal Command breakdown**

```
blender -b --factory-startup -noaudio -P test/renderers/blender-cycles/render.py -- {"scenario": {...}, "outputFile": "..."}
```

0. `blender` is path to the blender executable
1. `-b` is for background mode
2. `--factory-startup` prevents any user addons/settings from interfering
3. `-noaudio` prevents using the audio driver
4. `-P` runs the supplied python script (case sensitive)
5. `test/renderers/blender-cycles/render.py` is the path to the python file
6. `{"scenario": {...}, "outputFile": "..."}` is the config json ( accessed using `sys.argv[6]` in render.py )

## Render Settings

- `128` samples
- `OpenImage Denoiser` is enabled
- Exports a `temp.exr` (32bit ZIP codec) to the output dir
- The EXR is exported in the Standard color space and then converted to ACES using PILLOW.

| Links |
| [Blender Home](https://www.blender.org/)
| [Blender 4.0.X](https://ftp.nluug.nl/pub/graphics/blender//release/Blender4.0/)
| [Blender Daily Builds](https://builder.blender.org/download/daily/)
