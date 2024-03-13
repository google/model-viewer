import bpy
import json
import numpy as np
import math
import sys
import subprocess
import os
from mathutils import Vector


# Determine the path to Blender's Python executable
blender_python_executable = sys.executable

# Construct the pip command
pip_command = [blender_python_executable, "-m", "pip", "install", "Pillow"]

# Run the pip command to install Pillow
try:
    subprocess.check_call(pip_command)
except subprocess.CalledProcessError as e:
    print(f"Failed to install Pillow. Error: {e}")

from PIL import Image


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
    ACESInputMat = np.array(
        [
            [0.59719, 0.07600, 0.02840],  # transposed from source
            [0.35458, 0.90834, 0.13383],
            [0.04823, 0.01566, 0.83777],
        ]
    )

    # ODT_SAT => XYZ => D60_2_D65 => sRGB
    ACESOutputMat = np.array(
        [
            [1.60475, -0.10208, -0.00327],  # transposed from source
            [-0.53108, 1.10813, -0.07276],
            [-0.07367, -0.00605, 1.07602],
        ]
    )

    img = img @ ACESInputMat
    img = RRTAndODTFit(img)
    img = img @ ACESOutputMat

    return img


def save_image(path, data):
    image = Image.fromarray(data)
    image.save(path, "PNG")


def bounding_sphere(objects):
    # return the bounding sphere center and radius for objects (in global coordinates)
    if not isinstance(objects, list):
        objects = [objects]
    points_co_global = []

    # GEOMETRY - by all vertices/points - more precis, more slow
    for obj in objects:
        points_co_global.extend(
            [obj.matrix_world @ vertex.co for vertex in obj.data.vertices]
        )

    def get_center(l):
        return (max(l) + min(l)) / 2 if l else 0.0

    x, y, z = [[point_co[i] for point_co in points_co_global] for i in range(3)]
    b_sphere_center = (
        Vector([get_center(axis) for axis in [x, y, z]]) if (x and y and z) else None
    )
    b_sphere_radius = (
        max(((point - b_sphere_center) for point in points_co_global))
        if b_sphere_center
        else None
    )
    return b_sphere_center, b_sphere_radius.length


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
            "model": "../../../shared-assets/models/glTF-Sample-Models/2.0/SheenChair/glTF-Binary/SheenChair.glb"
          },
          "outputFile": "../../../test/goldens/khronos-SheenChair/stellar-golden.png"
        }
    """
    config = json.loads(sys.argv[6])

    scenario = config["scenario"]
    outpath = config["outputFile"]
    directory = os.path.dirname(outpath)
    packages_directory = directory.split("render-fidelity-tools")[0]
    # multiply resolution by 2 to match other renderers
    width = scenario["dimensions"]["width"] * 2
    height = scenario["dimensions"]["height"] * 2
    scenePath = (
        packages_directory
        + "shared-assets"
        + scenario["model"].split("shared-assets")[1]
    )
    iblPath = (
        packages_directory
        + "shared-assets"
        + scenario["lighting"].split("shared-assets")[1]
    )
    render_skybox = scenario["renderSkybox"]
    target = np.array(
        [scenario["target"]["x"], scenario["target"]["y"], scenario["target"]["z"]]
    )
    theta = scenario["orbit"]["theta"]
    phi = scenario["orbit"]["phi"]
    radius = scenario["orbit"]["radius"]
    verticalFov = scenario["verticalFoV"]
    aspect = width / height

    # setup blender scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    # Import the GLTF model
    bpy.ops.import_scene.gltf(filepath=scenePath)

    # reset armatures to resting pose instead of frame 1 pose
    bpy.ops.object.select_all(action="DESELECT")
    bpy.ops.object.select_by_type(type="ARMATURE")
    for obj in bpy.context.selected_objects:
        if obj.type == "ARMATURE":
            obj.data.pose_position = "REST"

    # setup camera & target
    bpy.ops.object.empty_add(
        type="SINGLE_ARROW", align="WORLD", location=(0, 0, 0), scale=(1, 1, 1)
    )
    targetObj = bpy.context.object
    targetObj.name = "target"

    # Add the camera
    bpy.ops.object.camera_add(
        enter_editmode=False,
        align="VIEW",
        location=(0, 0, radius),
        rotation=(0, 0, 0),
        scale=(1, 1, 1),
    )
    camera = bpy.context.object
    bpy.context.scene.camera = camera

    # Set the camera's field of view
    camera.data.lens_unit = "FOV"
    if aspect > 1:
        # Calculate the horizontal FOV from the vertical FOV and aspect ratio
        horizontalFov = 2 * math.atan(math.tan(math.radians(verticalFov) / 2) * aspect)
        camera.data.angle = horizontalFov
    else:
        camera.data.angle = math.radians(verticalFov)

    # Set the empty as the parent of the camera
    targetObj.select_set(True)
    camera.select_set(True)
    bpy.context.view_layer.objects.active = targetObj
    bpy.ops.object.parent_set(
        type="OBJECT",
        keep_transform=False,
    )

    # move target to correct location
    targetObj.location.x = target[0]
    targetObj.location.y = -target[2]
    targetObj.location.z = target[1]

    # apply theta phi rotation on target
    targetObj.rotation_euler[0] = math.radians(phi)
    targetObj.rotation_euler[1] = 0
    targetObj.rotation_euler[2] = math.radians(theta)

    # set camera near/far to avoid clipping
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    b_sphere_co, b_sphere_radius = bounding_sphere(meshes)

    radius = max(radius, b_sphere_radius, 1e-5)
    camera.data.clip_start = 2 * radius / 1000
    camera.data.clip_end = 2 * radius

    # setup environment
    scn = bpy.context.scene
    world = bpy.data.worlds.new("World")  # Create a new world
    bpy.context.scene.world = world

    scn.world.use_nodes = True
    node_tree = bpy.data.worlds[scn.world.name].node_tree
    # clear existing nodes
    for node in node_tree.nodes:
        node_tree.nodes.remove(node)

    hdriNode = node_tree.nodes.new(type="ShaderNodeTexEnvironment")
    hdriNode.location = 0, 0
    hdriNode.image = bpy.data.images.load(iblPath)

    defNode = node_tree.nodes.new("ShaderNodeBackground")
    defNode.location = 250, 0

    outputNode = node_tree.nodes.new("ShaderNodeOutputWorld")
    outputNode.location = 500, 0

    node_tree.links.new(hdriNode.outputs[0], defNode.inputs[0])
    node_tree.links.new(defNode.outputs[0], outputNode.inputs[0])

    # setup transparent background
    bpy.context.scene.render.film_transparent = not render_skybox
    # setup renderer
    bpy.context.scene.render.resolution_x = width
    bpy.context.scene.render.resolution_y = height
    bpy.context.scene.render.engine = "CYCLES"
    bpy.context.scene.cycles.device = "GPU"
    bpy.context.scene.cycles.samples = 128
    bpy.context.scene.cycles.use_adaptive_sampling = True
    bpy.context.scene.cycles.use_denoising = True
    # bpy.context.scene.cycles.time_limit = 30 #30 seconds

    # setup output file settings
    bpy.context.scene.view_settings.view_transform = "Standard"
    bpy.context.scene.render.image_settings.file_format = "OPEN_EXR"
    bpy.context.scene.render.image_settings.color_mode = "RGBA"
    bpy.context.scene.render.image_settings.color_depth = "32"
    exr_path = directory + "/temp.exr"
    bpy.context.scene.render.filepath = exr_path

    # render exr
    bpy.ops.render.render(write_still=True)

    # Load the image
    bpy_image = bpy.data.images.load(exr_path)

    local_pixels = list(bpy_image.pixels[:])
    image = np.asarray(local_pixels).reshape((height, width, 4))
    image = np.flipud(image)  # flip Y

    # tonemap
    image[:, :, :3] *= 1.0 / 0.6
    image[:, :, :3] = ACESFilmicToneMapping(image[:, :, :3])

    # gamma
    image[:, :, :3] = np.power(np.clip(image[:, :, :3], 0.0, 0.9999), 1.0 / 2.2)

    if render_skybox:
        ldr = (image[:, :, :3] * 255).astype(np.uint8)
    else:
        ldr = (image * 255).astype(np.uint8)

    save_image(os.path.join("./", outpath), ldr)

    # delete exr file
    os.remove(exr_path)


if __name__ == "__main__":
    main()
