# V-Ray Render Tests

This render fidelity test suite is designed to test the V-Ray renderer.  It is built upon the officialy Chaos Group vray_gltf project here:

https://github.com/chaosgroup/vray_gltf

## Requirements

V-Ray App SDK works best under Windows with Python3.10.  MacOS and Linux are also supported but may require additional setup.

### V-Ray App SDK Python Bindings

The V-Ray App SDK Python bindings can be accessed via installing either the V-Ray App SDK or V-Ray for 3DS Max.  Both of these are proprietary tools and can only be accessed by Chaos Group customers.  Refer to the [official Chaos Group documentation for installation of the V-Ray App SDK Python Bidings](https://github.com/chaosgroup/vray_gltf#installing-and-running-the-v-ray-gltf-viewer).

### V-Ray License File

V-Ray App SDK requires a valid license to run.  If you are using a local license setup during the installation of the V-Ray App SDK or V-Ray for 3DS Max, it should just work by default.  If you need to specify it manually you can do so via following [the V-Ray Documentation](https://docs.chaos.com/display/LIC5/Sharing+vrlclient.xml+over+a+network) on the ```vrlclient.xml``` file and the ```VRAY_AUTH_CLIENT_FILE_PATH``` environment variable.

### Python Libraries

V-Ray 6 uses Python 3.9 or 3.10.  It is suggested that one use a Python virtual environment:

```
# create a virtual environment
python3.10 -m venv penv310

# activate the virtual environment
source penv310/bin/activate
```

Install the required libraries via:

```
pip install numpy pyquaternion numba pillow
```

### Running the Tests

Be sure to build the whole library from the root.  After that is done, you can run just the tests:

```
npm run update-screenshots
```

