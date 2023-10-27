import json
import os
import sys

import math
import vray
import numpy as np
from PIL import Image

import vray_gltf.Gltf_Parser.gltfparser as gltfp

def RRTAndODTFit(v: np.array):
    a = v * (v + 0.0245786) - 0.000090537
    b = v * (0.983729 * v + 0.4329510) + 0.238081
    return a / b

def ACESFilmicToneMapping(img: np.array) -> np.array:
    """Using the same tonemapping function as three.js and glTF Sample Viewer
    https://github.com/mrdoob/three.js/blob/dev/examples/jsm/shaders/ACESFilmicToneMappingShader.js

    Args:
        img (np.array): The HDR image to be tonemapped

    Returns:
        np.array: The tonemapped LDR image
    """
    # sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT
    ACESInputMat = np.array([
        [0.59719, 0.07600, 0.02840], # transposed from source
        [0.35458, 0.90834, 0.13383],
        [0.04823, 0.01566, 0.83777],
        ])

    # ODT_SAT => XYZ => D60_2_D65 => sRGB
    ACESOutputMat = np.array([
        [ 1.60475, -0.10208, -0.00327], # transposed from source
        [-0.53108,  1.10813, -0.07276],
        [-0.07367, -0.00605,  1.07602],
        ])

    img = img@ACESInputMat
    img = RRTAndODTFit(img)
    img = img@ACESOutputMat

    return img;

def save_image(path, data):
    image = Image.fromarray(data)
    image.save(path, "PNG")

def dumpMsg(renderer, message, level, instant):
    if level == vray.LOGLEVEL_ERROR:
        print("[ERROR]", message)
    elif level == vray.LOGLEVEL_WARNING:
        print("[Warning]", message)
    elif level == vray.LOGLEVEL_INFO:
        print("[info]", message)

def main():
    """cmd render script

      ARGS:
          argv[1] (str): The stringified json object containing scenario config and outputPath properties
          Example:
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
            "outputFile": "../../../test/goldens/khronos-SheenChair/stellar-golden.png"
          }
    """
    config = json.loads(sys.argv[1])
    print(config)

    scenario = config["scenario"]
    outpath = config["outputFile"]
    scene_path = "shared-assets" + scenario["model"].split("shared-assets")[1]
    lighting_path = "shared-assets" + scenario["lighting"].split("shared-assets")[1]
    # TODO auto-detect HiDPI?  I'm only multiplying by 2 here to match the default behaviour of other renderers
    width = scenario["dimensions"]["width"] * 2
    height = scenario["dimensions"]["height"] * 2
    target = scenario["target"]
    orbit = scenario["orbit"]
    fovy = scenario["verticalFoV"] * math.pi / 180.0
    render_skybox = scenario["renderSkybox"]

    parser = gltfp.GltfParser()
    renderer = vray.VRayRenderer()

    renderer.setImprovedDefaultSettings()
    renderer.setOnLogMessage(dumpMsg)
    renderer.renderMode = "production"
    renderer.size = (width, height)
    renderer.setInteractiveNoiseThreshold(0.01)

    # White background
    environment = renderer.classes.SettingsEnvironment.getInstanceOrCreate()
    environment.bg_color = vray.AColor(1.0, 1.0, 1.0, 1.0)

    # Set the units settings
    photometricSettings = renderer.classes.SettingsUnitsInfo.getInstanceOrCreate()
    photometricSettings.photometric_scale = 1.0
    photometricSettings.scene_upDir = vray.Vector(0.0, 1.0, 0.0) # glTF is Y-up
    photometricSettings.meters_scale = 1.0 # Assume 1 unit is 1 meter

    # Camera
    theta = orbit["theta"] * math.pi / 180.0
    phi = orbit["phi"] * math.pi / 180.0
    radius = orbit["radius"]

    radius_sin_phi = radius * math.sin(phi)
    cam_pos = [
        radius_sin_phi * math.sin(theta) + target["x"],
        radius * math.cos(phi) + target["y"], #y-up
        radius_sin_phi * math.cos(theta) + target["z"],
    ]

    if radius > 0:
        center = vray.Vector(target["x"], target["y"], target["z"])
    else:
        center = vray.Vector(
            cam_pos[0] - math.sin(phi) * math.sin(theta),
            cam_pos[1] - math.cos(phi),
            cam_pos[2] - math.sin(phi) * math.cos(theta))

    parser.use_default_cam = True
    parser.default_cam_rot = (0.0, 0.0, 0.0)
    parser.average_scene_pos_or = center
    parser.default_cam_pos = cam_pos
    parser.default_cam_fov = 2.0 * math.atan(math.tan(fovy / 2.0) * width / height) * 180.0 / math.pi
    parser.default_cam_zoom = 0.0
    parser.default_cam_view = "auto"
    parser.lighting = lighting_path
    parser.render_skybox = render_skybox
    parser.parseScene(scene_path, renderer)

    parser._setup_frame(0, renderer)
    renderer.startSync()
    renderer.waitForRenderEnd()
    image = np.asarray(renderer.getImage()).reshape((height, width, 4))

    # tonemap
    image[:,:,:3] *= 1.0 / 0.6;
    image[:,:,:3] = ACESFilmicToneMapping(image[:,:,:3])

    # gamma
    image[:,:,:3] = np.power(np.clip(image[:,:,:3], 0.0, 0.9999), 1.0 / 2.2)

    if render_skybox:
        ldr = (image[:,:,:3] * 255).astype(np.uint8)
    else:
        ldr = (image * 255).astype(np.uint8)

    save_image(os.path.join("./", outpath), ldr)

if __name__ == "__main__":
    main()
