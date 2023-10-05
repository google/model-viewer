# Blender Cycles

## Requirements

- Install blender and add to `path` [Launching from command line docs](https://docs.blender.org/manual/en/latest/advanced/command_line/launch/index.html#command-line-launch-index)

## The command

```
blender -b -P test/renderers/blender-cycles/render.py -- {"scenario": {...}, "outputFile": "..."}
```

**Command breakdown**
1- `blender` is path to the blender executable
2- `-b` is for background mode
3- `-P` runs the python supplied script
4- `test/renderers/blender-cycles/render.py` is the path to the python file
5- and last part is the config json ( accessed under `sys.argv[5]` in render.py )

## Settings

- `128` samples
- `OpenImage Denoiser` is enabled
- Exports a `temp.exr` (32bit ZIP codec) to the output dir
- The EXR is exported in the Standard color space and then converted to ACES using PILLOW.

| Links |
| ----- |

| [Blender Home](https://www.blender.org/)
| [Blender 3.6.x](https://download.blender.org/release/Blender3.6/)
| [Blender Daily Builds](https://builder.blender.org/download/daily/)
