import { glMatrix, mat4, vec3, quat, mat3, vec4 } from 'gl-matrix';
import { decode } from 'jpeg-js';
import { decode as decode$1 } from 'fast-png';
import axios from 'axios';

function jsToGl(array)
{
    let tensor = new glMatrix.ARRAY_TYPE(array.length);

    for (let i = 0; i < array.length; ++i)
    {
        tensor[i] = array[i];
    }

    return tensor;
}

function jsToGlSlice(array, offset, stride)
{
    let tensor = new glMatrix.ARRAY_TYPE(stride);

    for (let i = 0; i < stride; ++i)
    {
        tensor[i] = array[offset + i];
    }

    return tensor;
}

function initGlForMembers(gltfObj, gltf, webGlContext)
{
    for (const name of Object.keys(gltfObj))
    {
        const member = gltfObj[name];

        if (member === undefined)
        {
            continue;
        }
        if (member.initGl !== undefined)
        {
            member.initGl(gltf, webGlContext);
        }
        if (Array.isArray(member))
        {
            for (const element of member)
            {
                if (element !== null && element !== undefined && element.initGl !== undefined)
                {
                    element.initGl(gltf, webGlContext);
                }
            }
        }
    }
}

function objectsFromJsons(jsonObjects, GltfType)
{
    if (jsonObjects === undefined)
    {
        return [];
    }

    const objects = [];
    for (const jsonObject of jsonObjects)
    {
        objects.push(objectFromJson(jsonObject, GltfType));
    }
    return objects;
}

function objectFromJson(jsonObject, GltfType)
{
    const object = new GltfType();
    object.fromJson(jsonObject);
    return object;
}

function fromKeys(target, jsonObj, ignore = [])
{
    for(let k of Object.keys(target))
    {
        if (ignore && ignore.find(function(elem){return elem == k;}) !== undefined)
        {
            continue; // skip
        }
        if (jsonObj[k] !== undefined)
        {
            let normalizedK = k.replace("^@", "");
            target[normalizedK] = jsonObj[k];
        }
    }
}

function stringHash(str, seed = 0)
{
    for(var i = 0; i < str.length; ++i)
    {
        seed = Math.imul(31, seed) + str.charCodeAt(i) | 0;
    }

    return seed;
}

function combineHashes(hash1, hash2)
{
    return hash1 ^ (hash1 + 0x9e3779b9 + (hash2 << 6) + (hash2 >> 2));
}

function clamp(number, min, max)
{
    return Math.min(Math.max(number, min), max);
}

function getIsGlb(filename)
{
    return getExtension(filename) == "glb";
}

function getIsGltf(filename)
{
    return getExtension(filename) == "gltf";
}

function getIsHdr(filename)
{
    return getExtension(filename) == "hdr";
}

function getExtension(filename)
{
    const split = filename.toLowerCase().split(".");
    if (split.length == 1)
    {
        return undefined;
    }
    return split[split.length - 1];
}

function getFileName(filePath)
{
    const split = filePath.split("/");
    return split[split.length - 1];
}

function getFileNameWithoutExtension(filePath)
{
    const filename = getFileName(filePath);
    const index = filename.lastIndexOf(".");
    return filename.slice(0, index);
}

function getContainingFolder(filePath)
{
    return filePath.substring(0, filePath.lastIndexOf("/") + 1);
}

function combinePaths()
{
    const parts = Array.from(arguments);
    return parts.join("/");
}

// marker interface used to for parsing the uniforms
class UniformStruct { }

class AnimationTimer
{
    constructor()
    {
        this.startTime = 0;
        this.paused = true;
        this.fixedTime = null;
        this.pausedTime = 0;
    }

    elapsedSec()
    {
        if(this.paused)
        {
            return this.pausedTime / 1000;
        }
        else
        {
            return this.fixedTime || (new Date().getTime() - this.startTime) / 1000;
        }
    }

    toggle()
    {
        if(this.paused)
        {
            this.unpause();
        }
        else
        {
            this.pause();
        }
    }

    start()
    {
        this.startTime = new Date().getTime();
        this.paused = false;
    }

    pause()
    {
        this.pausedTime = new Date().getTime() - this.startTime;
        this.paused = true;
    }

    unpause()
    {
        this.startTime += new Date().getTime() - this.startTime - this.pausedTime;
        this.paused = false;
    }

    reset()
    {
        if(!this.paused) {
            // Animation is running.
            this.startTime = new Date().getTime();
        }
        else {
            this.startTime = 0;
        }
        this.pausedTime = 0;
    }

    setFixedTime(timeInSec)
    {
        this.paused = false;
        this.fixedTime = timeInSec;
    }
}

// base class for all gltf objects
class GltfObject
{
    constructor()
    {
        this.extensions = undefined;
        this.extras = undefined;
    }

    fromJson(json)
    {
        fromKeys(this, json);
    }

    initGl(gltf, webGlContext)
    {
        initGlForMembers(this, gltf, webGlContext);
    }
}

class gltfCamera extends GltfObject
{
    constructor(
        type = "perspective",
        znear = 0.01,
        zfar = Infinity,
        yfov = 45.0 * Math.PI / 180.0,
        aspectRatio = undefined,
        xmag = 1.0,
        ymag = 1.0,
        name = undefined,
        nodeIndex = undefined)
    {
        super();
        this.type = type;
        this.znear = znear;
        this.zfar = zfar;
        this.yfov = yfov; // radians
        this.xmag = xmag;
        this.ymag = ymag;
        this.aspectRatio = aspectRatio;
        this.name = name;
        this.node = nodeIndex;
    }

    initGl(gltf, webGlContext)
    {
        super.initGl(gltf, webGlContext);

        let cameraIndex = undefined;
        for (let i = 0; i < gltf.nodes.length; i++)
        {
            cameraIndex = gltf.nodes[i].camera;
            if (cameraIndex === undefined)
            {
                continue;
            }

            if (gltf.cameras[cameraIndex] === this)
            {
                this.node = i;
                break;
            }
        }

        // cameraIndex stays undefined if camera is not assigned to any node
        if(this.node === undefined && cameraIndex !== undefined)
        {
            console.error("Invalid node for camera " + cameraIndex);
        }
    }

    fromJson(jsonCamera)
    {
        this.name = name;
        if(jsonCamera.perspective !== undefined)
        {
            this.type = "perspective";
            fromKeys(this, jsonCamera.perspective);
        }
        else if(jsonCamera.orthographic !== undefined)
        {
            this.type = "orthographic";
            fromKeys(this, jsonCamera.orthographic);
        }
    }

    sortPrimitivesByDepth(gltf, drawables)
    {
        // Precompute the distances to avoid their computation during sorting.
        for (const drawable of drawables)
        {
            const modelView = mat4.create();
            mat4.multiply(modelView, this.getViewMatrix(gltf), drawable.node.worldTransform);

            // Transform primitive centroid to find the primitive's depth.
            const pos = vec3.transformMat4(vec3.create(), vec3.clone(drawable.primitive.centroid), modelView);

            drawable.depth = pos[2];
        }

        // 1. Remove primitives that are behind the camera.
        //    --> They will never be visible and it is cheap to discard them here.
        // 2. Sort primitives so that the furthest nodes are rendered first.
        //    This is required for correct transparency rendering.
        return drawables
            .filter((a) => a.depth <= 0)
            .sort((a, b) => a.depth - b.depth);
    }

    getProjectionMatrix()
    {
        const projection = mat4.create();

        if (this.type === "perspective")
        {
            mat4.perspective(projection, this.yfov, this.aspectRatio, this.znear, this.zfar);
        }
        else if (this.type === "orthographic")
        {
            projection[0]  = 1.0 / this.xmag;
            projection[5]  = 1.0 / this.ymag;
            projection[10] = 2.0 / (this.znear - this.zfar);
            projection[14] = (this.zfar + this.znear) / (this.znear - this.zfar);
        }

        return projection;
    }

    getViewMatrix(gltf)
    {
        const view = mat4.create();
        const position = this.getPosition(gltf);
        const target = this.getTarget(gltf);
        mat4.lookAt(view, position, target, vec3.fromValues(0, 1, 0));
        return view;
    }

    getTarget(gltf)
    {
        const target = vec3.create();
        const position = this.getPosition(gltf);
        const lookDirection = this.getLookDirection(gltf);
        vec3.add(target, lookDirection, position);
        return target;
    }

    getPosition(gltf)
    {
        const position = vec3.create();
        const node = this.getNode(gltf);
        mat4.getTranslation(position, node.worldTransform);
        return position;
    }

    getLookDirection(gltf)
    {
        const direction = vec3.create();
        const rotation = this.getRotation(gltf);
        vec3.transformQuat(direction, vec3.fromValues(0, 0, -1), rotation);
        return direction;
    }

    getRotation(gltf)
    {
        const rotation = quat.create();
        const node = this.getNode(gltf);
        mat4.getRotation(rotation, node.worldTransform);
        return rotation;
    }

    clone()
    {
        return new gltfCamera(
            this.type,
            this.znear,
            this.zfar,
            this.yfov,
            this.aspectRatio,
            this.xmag,
            this.ymag,
            this.name,
            this.node);
    }

    getNode(gltf)
    {
        return gltf.nodes[this.node];
    }

    // Returns a JSON object describing the user camera's current values.
    getDescription(gltf)
    {
        const camera = {
            "type": this.type
        };

        if (this.name != undefined)
        {
            camera["name"] = this.name;
        }

        if (this.type === "perspective")
        {
            if (this.aspectRatio != undefined)
            {
                camera["perspective"]["aspectRatio"] = this.aspectRatio;
            }
            camera["perspective"]["yfov"] = this.yfov;
            if (this.zfar != Infinity)
            {
                camera["perspective"]["zfar"] = this.zfar;
            }
            camera["perspective"]["ynear"] = this.ynear;
        }
        else if (this.type === "orthographic")
        {
            camera["orthographic"]["xmag"] = this.xmag;
            camera["orthographic"]["ymag"] = this.ymag;
            camera["orthographic"]["zfar"] = this.zfar;
            camera["orthographic"]["ynear"] = this.ynear;
        }

        const mat = this.getViewMatrix(gltf);

        const node = {
            "camera": 0,
            "matrix": [mat[0], mat[1], mat[2], mat[3],
                       mat[4], mat[5], mat[6], mat[7],
                       mat[8], mat[9], mat[10], mat[11],
                       mat[12], mat[13], mat[14], mat[15]]
        };

        if (this.nodeIndex != undefined && gltf.nodes[this.nodeIndex].name != undefined)
        {
            node["name"] = gltf.nodes[this.nodeIndex].name;
        }

        return {
            "node": node,
            "camera": camera
        }
    }
}

function getSceneExtents(gltf, sceneIndex, outMin, outMax)
{
    for (const i of [0, 1, 2])
    {
        outMin[i] = Number.POSITIVE_INFINITY;
        outMax[i] = Number.NEGATIVE_INFINITY;
    }

    const scene = gltf.scenes[sceneIndex];

    let nodeIndices = scene.nodes.slice();
    while(nodeIndices.length > 0)
    {
        const node = gltf.nodes[nodeIndices.pop()];
        nodeIndices = nodeIndices.concat(node.children);

        if (node.mesh === undefined)
        {
            continue;
        }

        const mesh = gltf.meshes[node.mesh];
        if (mesh.primitives === undefined)
        {
            continue;
        }

        for (const primitive of mesh.primitives)
        {
            const attribute = primitive.glAttributes.find(a => a.attribute == "POSITION");
            if (attribute === undefined)
            {
                continue;
            }

            const accessor = gltf.accessors[attribute.accessor];
            const assetMin = vec3.create();
            const assetMax = vec3.create();
            getExtentsFromAccessor(accessor, node.worldTransform, assetMin, assetMax);

            for (const i of [0, 1, 2])
            {
                outMin[i] = Math.min(outMin[i], assetMin[i]);
                outMax[i] = Math.max(outMax[i], assetMax[i]);
            }
        }
    }
}

function getExtentsFromAccessor(accessor, worldTransform, outMin, outMax)
{
    const boxMin = vec3.create();
    vec3.transformMat4(boxMin, jsToGl(accessor.min), worldTransform);

    const boxMax = vec3.create();
    vec3.transformMat4(boxMax, jsToGl(accessor.max), worldTransform);

    const center = vec3.create();
    vec3.add(center, boxMax, boxMin);
    vec3.scale(center, center, 0.5);

    const centerToSurface = vec3.create();
    vec3.sub(centerToSurface, boxMax, center);

    const radius = vec3.length(centerToSurface);

    for (const i of [0, 1, 2])
    {
        outMin[i] = center[i] - radius;
        outMax[i] = center[i] + radius;
    }
}

function computePrimitiveCentroids(gltf)
{
    const meshes = gltf.nodes.filter(node => node.mesh !== undefined).map(node => gltf.meshes[node.mesh]);
    const primitives = meshes.reduce((acc, mesh) => acc.concat(mesh.primitives), []);
    for(const primitive of primitives) {

        const positionsAccessor = gltf.accessors[primitive.attributes.POSITION];
        const positions = positionsAccessor.getTypedView(gltf);

        if(primitive.indices !== undefined)
        {
            // Primitive has indices.

            const indicesAccessor = gltf.accessors[primitive.indices];

            const indices = indicesAccessor.getTypedView(gltf);

            const acc = new Float32Array(3);

            for(let i = 0; i < indices.length; i++) {
                const offset = 3 * indices[i];
                acc[0] += positions[offset];
                acc[1] += positions[offset + 1];
                acc[2] += positions[offset + 2];
            }

            const centroid = new Float32Array([
                acc[0] / indices.length,
                acc[1] / indices.length,
                acc[2] / indices.length,
            ]);

            primitive.setCentroid(centroid);
        }
        else
        {
            // Primitive does not have indices.

            const acc = new Float32Array(3);

            for(let i = 0; i < positions.length; i += 3) {
                acc[0] += positions[i];
                acc[1] += positions[i + 1];
                acc[2] += positions[i + 2];
            }

            const positionVectors = positions.length / 3;

            const centroid = new Float32Array([
                acc[0] / positionVectors,
                acc[1] / positionVectors,
                acc[2] / positionVectors,
            ]);

            primitive.setCentroid(centroid);
        }

    }
}

const VecZero = vec3.create();
const PanSpeedDenominator = 1200;
const MaxNearFarRatio = 10000;

class UserCamera extends gltfCamera
{
    constructor(
        target = [0, 0, 0],
        yaw = 0,
        pitch = 0,
        distance = 1)
    {
        super();

        this.target = jsToGl(target);
        this.yaw = yaw;
        this.pitch = pitch;
        this.distance = distance;
        this.zoomFactor = 1.04;
        this.orbitSpeed = 1 / 180;
        this.panSpeed = 1;
        this.sceneExtents = {
            min: vec3.create(),
            max: vec3.create()
        };
    }

    setVerticalFoV(yfov)
    {
        this.yfov = yfov;
    }

    getPosition()
    {
        // calculate direction from focus to camera (assuming camera is at positive z)
        // pitch rotates *around* x-axis, yaw rotates *around* y-axis
        const direction = vec3.fromValues(0, 0, this.distance);
        this.toGlobalOrientation(direction);

        const position = vec3.create();
        vec3.add(position, this.target, direction);
        return position;
    }

    getTarget()
    {
        return this.target;
    }

    lookAt(from, to)
    {
        // up is implicitly (0, 1, 0)
        this.target = to;

        const difference = vec3.create();
        vec3.subtract(difference, from, to);
        const projectedDifference = vec3.fromValues(from[0] - to[0], 0, from[2] - to[2]);

        this.pitch = vec3.angle(difference, projectedDifference);
        this.yaw = vec3.angle(projectedDifference, vec3.fromValues(1.0, 0.0, 0.0));
        this.distance = vec3.length(difference);
    }

    setPosition(position)
    {
        this.lookAt(position, this.target);
    }

    setTarget(target)
    {
        this.target = target;
    }

    setRotation(yaw, pitch)
    {
        this.yaw = yaw;
        this.pitch = pitch;
    }

    setZoom(distance)
    {
        this.distance = distance;
    }

    zoomBy(value)
    {
        if (value > 0)
        {
            this.distance *= this.zoomFactor;
        }
        else
        {
            this.distance /= this.zoomFactor;
        }
        this.fitCameraPlanesToExtents(this.sceneExtents.min, this.sceneExtents.max);
    }

    orbit(x, y)
    {
        const yMax = Math.PI / 2 - 0.01;
        this.yaw += (x * this.orbitSpeed);
        this.pitch += (y * this.orbitSpeed);
        this.pitch = clamp(this.pitch, -yMax, yMax);
    }

    pan(x, y)
    {
        const left = vec3.fromValues(-1, 0, 0);
        this.toGlobalOrientation(left);
        vec3.scale(left, left, x * this.panSpeed);

        const up = vec3.fromValues(0, 1, 0);
        this.toGlobalOrientation(up);
        vec3.scale(up, up, y * this.panSpeed);

        vec3.add(this.target, this.target, up);
        vec3.add(this.target, this.target, left);
    }

    fitPanSpeedToScene(min, max)
    {
        const longestDistance = vec3.distance(min, max);
        this.panSpeed = longestDistance / PanSpeedDenominator;
    }

    reset()
    {
        this.yaw = 0;
        this.pitch = 0;
        fitDistanceToExtents(this.sceneExtents.min, this.sceneExtents.max);
        fitCameraTargetToExtents(this.sceneExtents.min, this.sceneExtents.max);
    }

    fitViewToScene(gltf, sceneIndex)
    {
        getSceneExtents(gltf, sceneIndex, this.sceneExtents.min, this.sceneExtents.max);
        this.fitCameraTargetToExtents(this.sceneExtents.min, this.sceneExtents.max);
        this.fitDistanceToExtents(this.sceneExtents.min, this.sceneExtents.max);

        const direction = vec3.fromValues(0, 0, this.distance);
        vec3.add(this.getPosition(), this.target, direction);

        this.fitPanSpeedToScene(this.sceneExtents.min, this.sceneExtents.max);
        this.fitCameraPlanesToExtents(this.sceneExtents.min, this.sceneExtents.max);

        this.yaw = 0;
        this.pitch = 0;
    }

    // Converts orientation from camera space to global space
    toGlobalOrientation(vector)
    {
        vec3.rotateX(vector, vector, VecZero, -this.pitch);
        vec3.rotateY(vector, vector, VecZero, -this.yaw);
    }

    fitDistanceToExtents(min, max)
    {
        const maxAxisLength = Math.max(max[0] - min[0], max[1] - min[1]);
        const yfov = this.yfov;
        const xfov = this.yfov * this.aspectRatio;

        const yZoom = maxAxisLength / 2 / Math.tan(yfov / 2);
        const xZoom = maxAxisLength / 2 / Math.tan(xfov / 2);

        this.distance = Math.max(xZoom, yZoom);
    }

    fitCameraTargetToExtents(min, max)
    {
        for (const i of [0, 1, 2])
        {
            this.target[i] = (max[i] + min[i]) / 2;
        }
    }

    fitCameraPlanesToExtents(min, max)
    {
        // depends only on scene min/max and the camera distance

        // Manually increase scene extent just for the camera planes to avoid camera clipping in most situations.
        const longestDistance = 10 * vec3.distance(min, max);
        let zNear = this.distance - (longestDistance * 0.6);
        let zFar = this.distance + (longestDistance * 0.6);

        // minimum near plane value needs to depend on far plane value to avoid z fighting or too large near planes
        zNear = Math.max(zNear, zFar / MaxNearFarRatio);

        this.znear = zNear;
        this.zfar = zFar;
    }
}

function isPowerOf2(n)
{
    return n && (n & (n - 1)) === 0;
}

class AsyncFileReader
{
    static async readAsArrayBuffer(path) {
        return new Promise( (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(path);
        });
    }

    static async readAsText(path) {
        return new Promise( (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsText(path);
        });
    }

    static async readAsDataURL(path) {
        return new Promise( (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(path);
        });
    }
}

const ImageMimeType = {JPEG: "image/jpeg", PNG: "image/png", HDR: "image/vnd.radiance", KTX2: "image/ktx2", GLTEXTURE: "image/texture"};

let GL = undefined;

class gltfWebGl
{
    constructor(context)
    {
        this.context = context;
        if(GL === undefined)
        {
            GL = context;
        }
    }

    loadWebGlExtensions(webglExtensions)
    {
        for (let extension of webglExtensions)
        {
            if (this.context.getExtension(extension) === null)
            {
                console.warn("Extension " + extension + " not supported!");
            }
        }

        // let EXT_texture_filter_anisotropic = this.context.getExtension("EXT_texture_filter_anisotropic");

        // if (EXT_texture_filter_anisotropic)
        // {
        //     this.context.anisotropy = EXT_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT;
        //     this.context.maxAnisotropy = this.context.getParameter(EXT_texture_filter_anisotropic.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
        //     this.context.supports_EXT_texture_filter_anisotropic = true;
        // }
        // else
        // {
        //     this.context.supports_EXT_texture_filter_anisotropic = false;
        // }
    }

    setTexture(loc, gltf, textureInfo, texSlot)
    {
        if (loc === -1)
        {
            return false;
        }

        let gltfTex = gltf.textures[textureInfo.index];

        if (gltfTex === undefined)
        {
            console.warn("Texture is undefined: " + textureInfo.index);
            return false;
        }

        const image = gltf.images[gltfTex.source];
        if (image.mimeType === ImageMimeType.KTX2 ||
            image.mimeType === ImageMimeType.GLTEXTURE)
        {
            gltfTex.glTexture = image.image;
            gltfTex.initialized = true;
        }

        if (gltfTex.glTexture === undefined)
        {
            gltfTex.glTexture = this.context.createTexture();
        }

        this.context.activeTexture(GL.TEXTURE0 + texSlot);
        this.context.bindTexture(gltfTex.type, gltfTex.glTexture);

        this.context.uniform1i(loc, texSlot);

        if (!gltfTex.initialized)
        {
            const gltfSampler = gltf.samplers[gltfTex.sampler];

            if (gltfSampler === undefined)
            {
                console.warn("Sampler is undefined for texture: " + textureInfo.index);
                return false;
            }

            this.context.pixelStorei(GL.UNPACK_FLIP_Y_WEBGL, false);

            if (image === undefined)
            {
                console.warn("Image is undefined for texture: " + gltfTex.source);
                return false;
            }
            const internalformat = (textureInfo.linear || GL.SRGB8_ALPHA8 === undefined) ? GL.RGBA : GL.SRGB8_ALPHA8;
            this.context.texImage2D(image.type, image.miplevel, internalformat, GL.RGBA, GL.UNSIGNED_BYTE, image.image);
            const generateMips = image.shouldGenerateMips();

            this.setSampler(gltfSampler, gltfTex.type, generateMips);

            if (textureInfo.generateMips && generateMips)
            {
                // Until this point, images can be assumed to be power of two.
                switch (gltfSampler.minFilter)
                {
                case GL.NEAREST_MIPMAP_NEAREST:
                case GL.NEAREST_MIPMAP_LINEAR:
                case GL.LINEAR_MIPMAP_NEAREST:
                case GL.LINEAR_MIPMAP_LINEAR:
                    this.context.generateMipmap(gltfTex.type);
                    break;
                }
            }

            gltfTex.initialized = true;
        }

        return gltfTex.initialized;
    }

    setIndices(gltf, accessorIndex)
    {
        let gltfAccessor = gltf.accessors[accessorIndex];

        if (gltfAccessor.glBuffer === undefined)
        {
            gltfAccessor.glBuffer = this.context.createBuffer();

            let data = gltfAccessor.getTypedView(gltf);

            if (data === undefined)
            {
                return false;
            }

            this.context.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, gltfAccessor.glBuffer);
            this.context.bufferData(GL.ELEMENT_ARRAY_BUFFER, data, GL.STATIC_DRAW);
        }
        else
        {
            this.context.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, gltfAccessor.glBuffer);
        }

        return true;
    }

    enableAttribute(gltf, attributeLocation, gltfAccessor)
    {
        if (attributeLocation === -1)
        {
            console.warn("Tried to access unknown attribute");
            return false;
        }

        if(gltfAccessor.bufferView === undefined)
        {
            console.warn("Tried to access undefined bufferview");
            return true;
        }

        let gltfBufferView = gltf.bufferViews[gltfAccessor.bufferView];

        if (gltfAccessor.glBuffer === undefined)
        {
            gltfAccessor.glBuffer = this.context.createBuffer();

            let data = gltfAccessor.getTypedView(gltf);

            if (data === undefined)
            {
                return false;
            }

            this.context.bindBuffer(GL.ARRAY_BUFFER, gltfAccessor.glBuffer);
            this.context.bufferData(GL.ARRAY_BUFFER, data, GL.STATIC_DRAW);
        }
        else
        {
            this.context.bindBuffer(GL.ARRAY_BUFFER, gltfAccessor.glBuffer);
        }

        this.context.vertexAttribPointer(attributeLocation, gltfAccessor.getComponentCount(gltfAccessor.type), gltfAccessor.componentType, gltfAccessor.normalized, gltfBufferView.byteStride, 0);
        this.context.enableVertexAttribArray(attributeLocation);

        return true;
    }

    compileShader(shaderIdentifier, isVert, shaderSource)
    {
        const shader = this.context.createShader(isVert ? GL.VERTEX_SHADER : GL.FRAGMENT_SHADER);
        this.context.shaderSource(shader, shaderSource);
        this.context.compileShader(shader);
        const compiled = this.context.getShaderParameter(shader, GL.COMPILE_STATUS);

        if (!compiled)
        {
            // output surrounding source code
            let info = "";
            const messages = this.context.getShaderInfoLog(shader).split("\n");
            for(const message of messages)
            {
                info += message + "\n";
                const matches = message.match(/(?:(?:WARNING)|(?:ERROR)): [0-9]*:([0-9]*).*/i);
                if (matches && matches.length > 1)
                {
                    const lineNumber = parseInt(matches[1]) - 1;
                    const lines = shaderSource.split("\n");

                    for(let i = Math.max(0, lineNumber - 2); i < Math.min(lines.length, lineNumber + 3); i++)
                    {
                        if (lineNumber === i)
                        {
                            info += "->";
                        }
                        info += "\t" + lines[i] + "\n";
                    }
                }
            }

            throw new Error("Could not compile WebGL program '" + shaderIdentifier + "'. \n\n" + info);
        }

        return shader;
    }

    linkProgram(vertex, fragment)
    {
        let program = this.context.createProgram();
        this.context.attachShader(program, vertex);
        this.context.attachShader(program, fragment);
        this.context.linkProgram(program);

        if (!this.context.getProgramParameter(program, GL.LINK_STATUS))
        {
            var info = this.context.getProgramInfoLog(program);
            throw new Error('Could not link WebGL program. \n\n' + info);
        }

        return program;
    }

    //https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
    setSampler(gltfSamplerObj, type, generateMipmaps) // TEXTURE_2D
    {
        if (generateMipmaps)
        {
            this.context.texParameteri(type, GL.TEXTURE_WRAP_S, gltfSamplerObj.wrapS);
            this.context.texParameteri(type, GL.TEXTURE_WRAP_T, gltfSamplerObj.wrapT);
        }
        else
        {
            this.context.texParameteri(type, GL.TEXTURE_WRAP_S, GL.CLAMP_TO_EDGE);
            this.context.texParameteri(type, GL.TEXTURE_WRAP_T, GL.CLAMP_TO_EDGE);
        }

        // If not mip-mapped, force to non-mip-mapped sampler.
        if (!generateMipmaps && (gltfSamplerObj.minFilter != GL.NEAREST) && (gltfSamplerObj.minFilter != GL.LINEAR))
        {
            if ((gltfSamplerObj.minFilter == GL.NEAREST_MIPMAP_NEAREST) || (gltfSamplerObj.minFilter == GL.NEAREST_MIPMAP_LINEAR))
            {
                this.context.texParameteri(type, GL.TEXTURE_MIN_FILTER, GL.NEAREST);
            }
            else
            {
                this.context.texParameteri(type, GL.TEXTURE_MIN_FILTER, GL.LINEAR);
            }
        }
        else
        {
            this.context.texParameteri(type, GL.TEXTURE_MIN_FILTER, gltfSamplerObj.minFilter);
        }
        this.context.texParameteri(type, GL.TEXTURE_MAG_FILTER, gltfSamplerObj.magFilter);

        if (this.context.supports_EXT_texture_filter_anisotropic)
        {
            this.context.texParameterf(type, this.context.anisotropy, this.context.maxAnisotropy); // => 16xAF
        }
    }
}

class gltfImage extends GltfObject
{
    constructor(
        uri = undefined,
        type = GL.TEXTURE_2D,
        miplevel = 0,
        bufferView = undefined,
        name = undefined,
        mimeType = ImageMimeType.JPEG,
        image = undefined)
    {
        super();
        this.uri = uri;
        this.bufferView = bufferView;
        this.mimeType = mimeType;
        this.image = image; // javascript image
        this.name = name;
        this.type = type; // nonstandard
        this.miplevel = miplevel; // nonstandard
    }

    resolveRelativePath(basePath)
    {
        if (typeof this.uri === 'string' || this.uri instanceof String)
        {
            if (this.uri.startsWith('./'))
            {
                // Remove preceding './' from URI.
                this.uri = this.uri.substr(2);
            }
            this.uri = basePath + this.uri;
        }
    }

    async load(gltf, additionalFiles = undefined)
    {
        if (this.image !== undefined)
        {
            if (this.mimeType !== ImageMimeType.GLTEXTURE)
            {
                console.error("image has already been loaded");
            }
            return;
        }

        if (!await this.setImageFromBufferView(gltf) &&
            !await this.setImageFromFiles(additionalFiles, gltf) &&
            !await this.setImageFromUri(gltf))
        {
            console.error("Was not able to resolve image with uri '%s'", this.uri);
            return;
        }

        return;
    }

    static loadHTMLImage(url)
    {
        return new Promise( (resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image) );
            image.addEventListener('error', reject);
            image.src = url;
            image.crossOrigin = "";
        });
    }

    async setImageFromUri(gltf)
    {
        if (this.uri === undefined)
        {
            return false;
        }

        if(this.mimeType === ImageMimeType.KTX2)
        {
            if (gltf.ktxDecoder !== undefined)
            {
                this.image = await gltf.ktxDecoder.loadKtxFromUri(this.uri);
            }
            else
            {
                console.warn('Loading of ktx images failed: KtxDecoder not initalized');
            }
        }
        else if (typeof(Image) !== 'undefined' && (this.mimeType === ImageMimeType.JPEG || this.mimeType === ImageMimeType.PNG))
        {
            this.image = await gltfImage.loadHTMLImage(this.uri).catch( (error) => {
                console.error(error);
            });
        }
        else if(this.mimeType === ImageMimeType.JPEG && this.uri instanceof ArrayBuffer)
        {
            this.image = decode(this.uri, {useTArray: true});
        }
        else if(this.mimeType === ImageMimeType.PNG && this.uri instanceof ArrayBuffer)
        {
            this.image = decode$1(this.uri);
        }
        else
        {
            console.error("Unsupported image type " + this.mimeType);
            return false;
        }

        return true;
    }

    async setImageFromBufferView(gltf)
    {
        const view = gltf.bufferViews[this.bufferView];
        if (view === undefined)
        {
            return false;
        }

        const buffer = gltf.buffers[view.buffer].buffer;
        const array = new Uint8Array(buffer, view.byteOffset, view.byteLength);
        if (this.mimeType === ImageMimeType.KTX2)
        {
            if (gltf.ktxDecoder !== undefined)
            {
                this.image = await gltf.ktxDecoder.loadKtxFromBuffer(array);
            }
            else
            {
                console.warn('Loading of ktx images failed: KtxDecoder not initalized');
            }
        }
        else if(typeof(Image) !== 'undefined' && (this.mimeType === ImageMimeType.JPEG || this.mimeType === ImageMimeType.PNG))
        {
            const blob = new Blob([array], { "type": this.mimeType });
            const objectURL = URL.createObjectURL(blob);
            this.image = await gltfImage.loadHTMLImage(objectURL).catch( () => {
                console.error("Could not load image from buffer view");
            });
        }
        else if(this.mimeType === ImageMimeType.JPEG)
        {
            this.image = decode(array, {useTArray: true});
        }
        else if(this.mimeType === ImageMimeType.PNG)
        {
            this.image = decode$1(array);
        }
        else
        {
            console.error("Unsupported image type " + this.mimeType);
            return false;
        }

        return true;
    }

    async setImageFromFiles(files, gltf)
    {
        if (this.uri === undefined || files === undefined)
        {
            return false;
        }

        let foundFile = files.find(function(file)
        {
            if (file.name === this.uri || file.fullPath === this.uri)
            {
                return true;
            }
        }, this);

        if (foundFile === undefined)
        {
            return false;
        }

        if(this.mimeType === ImageMimeType.KTX2)
        {
            if (gltf.ktxDecoder !== undefined)
            {
                const data = new Uint8Array(await foundFile.arrayBuffer());
                this.image = await gltf.ktxDecoder.loadKtxFromBuffer(data);
            }
            else
            {
                console.warn('Loading of ktx images failed: KtxDecoder not initalized');
            }
        }
        else if (typeof(Image) !== 'undefined' && (this.mimeType === ImageMimeType.JPEG || this.mimeType === ImageMimeType.PNG))
        {
            const imageData = await AsyncFileReader.readAsDataURL(foundFile).catch( () => {
                console.error("Could not load image with FileReader");
            });
            this.image = await gltfImage.loadHTMLImage(imageData).catch( () => {
                console.error("Could not create image from FileReader image data");
            });
        }
        else
        {
            console.error("Unsupported image type " + this.mimeType);
            return false;
        }


        return true;
    }

    shouldGenerateMips()
    {
        return (isPowerOf2(this.image.width) && isPowerOf2(this.image.height));
    }
}

const ToneMaps =
{
    NONE: "None",
    ACES_FAST: "ACES fast",
    ACES: "ACES"
};

const DebugOutput =
{
    NONE: "None",
    METALLIC: "Metallic",
    ROUGHNESS: "Roughness",
    NORMAL: "Normal",
    WORLDSPACENORMAL: "Worldspace Normal",
    GEOMETRYNORMAL: "Geometry Normal",
    TANGENT: "Tangent",
    BITANGENT: "Bitangent",
    BASECOLOR: "Base Color",
    OCCLUSION: "Occlusion",
    EMISSIVE: "Emissive",
    DIFFUSE: "Diffuse",
    SPECULAR: "Specular",
    CLEARCOAT: "ClearCoat",
    SHEEN: "Sheen",
    TRANSMISSION: "Transmission",
    ALPHA: "Alpha",
    F0: "F0"
};

class GltfState
{
    constructor()
    {
        this.gltf = undefined;
        this.environment = undefined;
        this.renderingParameters = {
            morphing: true,
            skinning: true,
            clearColor: [58, 64, 74],
            exposure: 1.0,
            usePunctual: true,
            useIBL: true,
            toneMap: ToneMaps.LINEAR,
            debugOutput: DebugOutput.NONE,
            environmentBackground: false,
            environmentRotation: 90.0 //+X = 0 +Z = 90 -X = 180 -Z = 270
        };
        this.userCamera = new UserCamera();
        this.sceneIndex = 0;
        this.cameraIndex = undefined;
        this.animationIndices = [];
        this.animationTimer = new AnimationTimer();
        this.variant = undefined;
    }
}

class gltfShader
{
    constructor(program, hash, gl)
    {
        this.program = program;
        this.hash = hash;
        this.uniforms = new Map();
        this.attributes = new Map();
        this.unknownAttributes = [];
        this.unknownUniforms = [];
        this.gl = gl;

        if(this.program !== undefined)
        {
            const uniformCount = this.gl.context.getProgramParameter(this.program, GL.ACTIVE_UNIFORMS);
            for(let i = 0; i < uniformCount; ++i)
            {
                const info = this.gl.context.getActiveUniform(this.program, i);
                const loc = this.gl.context.getUniformLocation(this.program, info.name);
                this.uniforms.set(info.name, {type: info.type, loc: loc});
            }

            const attribCount = this.gl.context.getProgramParameter(this.program, GL.ACTIVE_ATTRIBUTES);
            for(let i = 0; i < attribCount; ++i)
            {
                const info = this.gl.context.getActiveAttrib(this.program, i);
                const loc = this.gl.context.getAttribLocation(this.program, info.name);
                this.attributes.set(info.name, loc);
            }
        }
    }

    destroy()
    {
        if (this.program !== undefined)
        {
            this.deleteProgram(this.program);
        }

        this.program = undefined;
    }

    getAttributeLocation(name)
    {
        const loc = this.attributes.get(name);
        if (loc === undefined)
        {
            if (this.unknownAttributes.find(n => n === name) === undefined)
            {
                console.log("Attribute '%s' does not exist", name);
                this.unknownAttributes.push(name);
            }
            return -1;
        }
        return loc;
    }

    getUniformLocation(name)
    {
        const uniform = this.uniforms.get(name);
        if (uniform === undefined)
        {
            if (this.unknownUniforms.find(n => n === name) === undefined)
            {
                this.unknownUniforms.push(name);
            }
            return -1;
        }
        return uniform.loc;
    }

    updateUniform(objectName, object, log = true)
    {
        if (object instanceof UniformStruct)
        {
            this.updateUniformStruct(objectName, object, log);
        }
        else if (Array.isArray(object))
        {
            this.updateUniformArray(objectName, object, log);
        }
        else
        {
            this.updateUniformValue(objectName, object, log);
        }
    }

    updateUniformArray(arrayName, array, log)
    {
        if(array[0] instanceof UniformStruct)
        {
            for (let i = 0; i < array.length; ++i)
            {
                let element = array[i];
                let uniformName = arrayName + "[" + i + "]";
                this.updateUniform(uniformName, element, log);
            }
        }else {
            let uniformName = arrayName + "[0]";

            let flat = [];

            if(Array.isArray(array[0]) || array[0].length !== undefined)
            {
                for (let i = 0; i < array.length; ++i)
                {
                    flat.push.apply(flat, Array.from(array[i]));
                }
            }
            else
            {
                flat = array;
            }

            if(flat.length === 0)
            {
                console.error("Failed to flatten uniform array " + uniformName);
                return;
            }

            this.updateUniformValue(uniformName, flat, log);
        }
    }

    updateUniformStruct(structName, object, log)
    {
        let memberNames = Object.keys(object);
        for (let memberName of memberNames)
        {
            let uniformName = structName + "." + memberName;
            this.updateUniform(uniformName, object[memberName], log);
        }
    }

    // upload the values of a uniform with the given name using type resolve to get correct function call
    updateUniformValue(uniformName, value, log)
    {
        const uniform = this.uniforms.get(uniformName);

        if(uniform !== undefined)
        {
            switch (uniform.type) {
            case GL.FLOAT:
            {
                if(Array.isArray(value) || value instanceof Float32Array)
                {
                    this.gl.context.uniform1fv(uniform.loc, value);
                }else {
                    this.gl.context.uniform1f(uniform.loc, value);
                }
                break;
            }
            case GL.FLOAT_VEC2: this.gl.context.uniform2fv(uniform.loc, value); break;
            case GL.FLOAT_VEC3: this.gl.context.uniform3fv(uniform.loc, value); break;
            case GL.FLOAT_VEC4: this.gl.context.uniform4fv(uniform.loc, value); break;

            case GL.INT:
            {
                if(Array.isArray(value) || value instanceof Uint32Array || value instanceof Int32Array)
                {
                    this.gl.context.uniform1iv(uniform.loc, value);
                }else {
                    this.gl.context.uniform1i(uniform.loc, value);
                }
                break;
            }
            case GL.INT_VEC2: this.gl.context.uniform2iv(uniform.loc, value); break;
            case GL.INT_VEC3: this.gl.context.uniform3iv(uniform.loc, value); break;
            case GL.INT_VEC4: this.gl.context.uniform4iv(uniform.loc, value); break;

            case GL.FLOAT_MAT2: this.gl.context.uniformMatrix2fv(uniform.loc, false, value); break;
            case GL.FLOAT_MAT3: this.gl.context.uniformMatrix3fv(uniform.loc, false, value); break;
            case GL.FLOAT_MAT4: this.gl.context.uniformMatrix4fv(uniform.loc, false, value); break;
            }
        }
        else if(log)
        {
            console.warn("Unkown uniform: " + uniformName);
        }
    }
}

// THis class generates and caches the shader source text for a given permutation
class ShaderCache
{
    constructor(sources, gl)
    {
        this.sources  = sources; // shader name -> source code
        this.shaders  = new Map(); // name & permutations hashed -> compiled shader
        this.programs = new Map(); // (vertex shader, fragment shader) -> program
        this.gl = gl;

        // resovle / expande sources (TODO: break include cycles)
        for (let [key, src] of this.sources)
        {
            let changed = false;
            for (let [includeName, includeSource] of this.sources)
            {
                //var pattern = RegExp(/#include</ + includeName + />/);
                const pattern = "#include <" + includeName + ">";

                if(src.includes(pattern))
                {
                    // only replace the first occurance
                    src = src.replace(pattern, includeSource);

                    // remove the others
                    while (src.includes(pattern))
                    {
                        src = src.replace(pattern, "");
                    }

                    changed = true;
                }
            }

            if(changed)
            {
                this.sources.set(key, src);
            }
        }
    }

    destroy()
    {
        for (let [, shader] of this.shaders.entries())
        {
            this.gl.context.deleteShader(shader);
            shader = undefined;
        }

        this.shaders.clear();

        for (let [, program] of this.programs)
        {
            program.destroy();
        }

        this.programs.clear();
    }

    // example args: "pbr.vert", ["NORMALS", "TANGENTS"]
    selectShader(shaderIdentifier, permutationDefines)
    {
        // first check shaders for the exact permutation
        // if not present, check sources and compile it
        // if not present, return null object

        const src = this.sources.get(shaderIdentifier);
        if(src === undefined)
        {
            console.log("Shader source for " + shaderIdentifier + " not found");
            return null;
        }

        const isVert = shaderIdentifier.endsWith(".vert");
        let hash = stringHash(shaderIdentifier);

        // console.log(shaderIdentifier);

        let defines = "#version 300 es\n";
        for(let define of permutationDefines)
        {
            // console.log(define);
            hash ^= stringHash(define);
            defines += "#define " + define + "\n";
        }

        let shader = this.shaders.get(hash);

        if(shader === undefined)
        {
            // console.log(defines);
            // compile this variant
            shader = this.gl.compileShader(shaderIdentifier, isVert, defines + src);
            this.shaders.set(hash, shader);
        }

        return hash;
    }

    getShaderProgram(vertexShaderHash, fragmentShaderHash)
    {
        const hash = combineHashes(vertexShaderHash, fragmentShaderHash);

        let program = this.programs.get(hash);

        if (program) // program already linked
        {
            return program;
        }
        else // link this shader program type!
        {
            let linkedProg = this.gl.linkProgram(this.shaders.get(vertexShaderHash), this.shaders.get(fragmentShaderHash));
            if(linkedProg)
            {
                let program = new gltfShader(linkedProg, hash, this.gl);
                this.programs.set(hash, program);
                return program;
            }
        }

        return undefined;
    }
}

var pbrShader = "precision highp float;\n#define GLSLIFY 1\n#include <tonemapping.glsl>\n#include <textures.glsl>\n#include <functions.glsl>\n#include <brdf.glsl>\n#include <punctual.glsl>\n#include <ibl.glsl>\nout vec4 g_finalColor;\n#ifdef USE_PUNCTUAL\nuniform Light u_Lights[LIGHT_COUNT+1];\n#endif\nuniform float u_MetallicFactor;uniform float u_RoughnessFactor;uniform vec4 u_BaseColorFactor;uniform vec3 u_SpecularFactor;uniform vec4 u_DiffuseFactor;uniform float u_GlossinessFactor;uniform float u_SheenRoughnessFactor;uniform vec3 u_SheenColorFactor;uniform float u_ClearcoatFactor;uniform float u_ClearcoatRoughnessFactor;uniform float u_TransmissionFactor;uniform float u_AlphaCutoff;uniform vec3 u_Camera;\n#ifdef MATERIAL_TRANSMISSION\nuniform ivec2 u_ScreenSize;\n#endif\nstruct MaterialInfo{float perceptualRoughness;vec3 f0;float alphaRoughness;vec3 albedoColor;vec3 f90;float metallic;vec3 n;vec3 baseColor;float sheenRoughnessFactor;vec3 sheenColorFactor;vec3 clearcoatF0;vec3 clearcoatF90;float clearcoatFactor;vec3 clearcoatNormal;float clearcoatRoughness;float transmissionFactor;};NormalInfo getNormalInfo(vec3 v){vec2 UV=getNormalUV();vec3 uv_dx=dFdx(vec3(UV,0.0));vec3 uv_dy=dFdy(vec3(UV,0.0));vec3 t_=(uv_dy.t*dFdx(v_Position)-uv_dx.t*dFdy(v_Position))/(uv_dx.s*uv_dy.t-uv_dy.s*uv_dx.t);vec3 n,t,b,ng;\n#ifdef HAS_TANGENTS\nt=normalize(v_TBN[0]);b=normalize(v_TBN[1]);ng=normalize(v_TBN[2]);\n#else\n#ifdef HAS_NORMALS\nng=normalize(v_Normal);\n#else\nng=normalize(cross(dFdx(v_Position),dFdy(v_Position)));\n#endif\nt=normalize(t_-ng*dot(ng,t_));b=cross(ng,t);\n#endif\nif(gl_FrontFacing==false){t*=-1.0;b*=-1.0;ng*=-1.0;}\n#ifdef HAS_NORMAL_MAP\nn=texture(u_NormalSampler,UV).rgb*2.0-vec3(1.0);n*=vec3(u_NormalScale,u_NormalScale,1.0);n=mat3(t,b,ng)*normalize(n);\n#else\nn=ng;\n#endif\nNormalInfo info;info.ng=ng;info.t=t;info.b=b;info.n=n;return info;}vec4 getBaseColor(){vec4 baseColor=vec4(1.0,1.0,1.0,1.0);\n#if defined(MATERIAL_SPECULARGLOSSINESS)\nbaseColor=u_DiffuseFactor;\n#elif defined(MATERIAL_METALLICROUGHNESS)\nbaseColor=u_BaseColorFactor;\n#endif\n#if defined(MATERIAL_SPECULARGLOSSINESS) && defined(HAS_DIFFUSE_MAP)\nbaseColor*=texture(u_DiffuseSampler,getDiffuseUV());\n#elif defined(MATERIAL_METALLICROUGHNESS) && defined(HAS_BASE_COLOR_MAP)\nbaseColor*=texture(u_BaseColorSampler,getBaseColorUV());\n#endif\nreturn baseColor*getVertexColor();}MaterialInfo getSpecularGlossinessInfo(MaterialInfo info){info.f0=u_SpecularFactor;info.perceptualRoughness=u_GlossinessFactor;\n#ifdef HAS_SPECULAR_GLOSSINESS_MAP\nvec4 sgSample=texture(u_SpecularGlossinessSampler,getSpecularGlossinessUV());info.perceptualRoughness*=sgSample.a;info.f0*=sgSample.rgb;\n#endif\ninfo.perceptualRoughness=1.0-info.perceptualRoughness;info.albedoColor=info.baseColor.rgb*(1.0-max(max(info.f0.r,info.f0.g),info.f0.b));return info;}MaterialInfo getMetallicRoughnessInfo(MaterialInfo info,float f0_ior){info.metallic=u_MetallicFactor;info.perceptualRoughness=u_RoughnessFactor;\n#ifdef HAS_METALLIC_ROUGHNESS_MAP\nvec4 mrSample=texture(u_MetallicRoughnessSampler,getMetallicRoughnessUV());info.perceptualRoughness*=mrSample.g;info.metallic*=mrSample.b;\n#endif\nvec3 f0=vec3(f0_ior);info.albedoColor=mix(info.baseColor.rgb*(vec3(1.0)-f0),vec3(0),info.metallic);info.f0=mix(f0,info.baseColor.rgb,info.metallic);return info;}MaterialInfo getSheenInfo(MaterialInfo info){info.sheenColorFactor=u_SheenColorFactor;info.sheenRoughnessFactor=u_SheenRoughnessFactor;\n#ifdef HAS_SHEEN_COLOR_MAP\nvec4 sheenColorSample=texture(u_SheenColorSampler,getSheenColorUV());info.sheenColorFactor*=sheenColorSample.rgb;\n#endif\n#ifdef HAS_SHEEN_ROUGHNESS_MAP\nvec4 sheenRoughnessSample=texture(u_SheenRoughnessSampler,getSheenRoughnessUV());info.sheenRoughnessFactor*=sheenRoughnessSample.a;\n#endif\nreturn info;}\n#ifdef MATERIAL_TRANSMISSION\nMaterialInfo getTransmissionInfo(MaterialInfo info){info.transmissionFactor=u_TransmissionFactor;\n#ifdef HAS_TRANSMISSION_MAP\nvec4 transmissionSample=texture(u_TransmissionSampler,getTransmissionUV());info.transmissionFactor*=transmissionSample.r;\n#endif\nreturn info;}\n#endif\nMaterialInfo getClearCoatInfo(MaterialInfo info,NormalInfo normalInfo,float f0_ior){info.clearcoatFactor=u_ClearcoatFactor;info.clearcoatRoughness=u_ClearcoatRoughnessFactor;info.clearcoatF0=vec3(f0_ior);info.clearcoatF90=vec3(1.0);\n#ifdef HAS_CLEARCOAT_TEXTURE_MAP\nvec4 clearcoatSample=texture(u_ClearcoatSampler,getClearcoatUV());info.clearcoatFactor*=clearcoatSample.r;\n#endif\n#ifdef HAS_CLEARCOAT_ROUGHNESS_MAP\nvec4 clearcoatSampleRoughness=texture(u_ClearcoatRoughnessSampler,getClearcoatRoughnessUV());info.clearcoatRoughness*=clearcoatSampleRoughness.g;\n#endif\n#ifdef HAS_CLEARCOAT_NORMAL_MAP\nvec4 clearcoatSampleNormal=texture(u_ClearcoatNormalSampler,getClearcoatNormalUV());info.clearcoatNormal=normalize(clearcoatSampleNormal.xyz);\n#else\ninfo.clearcoatNormal=normalInfo.ng;\n#endif\ninfo.clearcoatRoughness=clamp(info.clearcoatRoughness,0.0,1.0);return info;}float albedoSheenScalingLUT(float NdotV,float sheenRoughnessFactor){return texture(u_SheenELUT,vec2(NdotV,sheenRoughnessFactor)).r;}void main(){vec4 baseColor=getBaseColor();\n#ifdef ALPHAMODE_OPAQUE\nbaseColor.a=1.0;\n#endif\n#ifdef MATERIAL_UNLIT\ng_finalColor=(vec4(linearTosRGB(baseColor.rgb),baseColor.a));return;\n#endif\nvec3 v=normalize(u_Camera-v_Position);NormalInfo normalInfo=getNormalInfo(v);vec3 n=normalInfo.n;vec3 t=normalInfo.t;vec3 b=normalInfo.b;float NdotV=clampedDot(n,v);float TdotV=clampedDot(t,v);float BdotV=clampedDot(b,v);MaterialInfo materialInfo;materialInfo.baseColor=baseColor.rgb;float ior=1.5;float f0_ior=0.04;\n#ifdef MATERIAL_SPECULARGLOSSINESS\nmaterialInfo=getSpecularGlossinessInfo(materialInfo);\n#endif\n#ifdef MATERIAL_METALLICROUGHNESS\nmaterialInfo=getMetallicRoughnessInfo(materialInfo,f0_ior);\n#endif\n#ifdef MATERIAL_SHEEN\nmaterialInfo=getSheenInfo(materialInfo);\n#endif\n#ifdef MATERIAL_CLEARCOAT\nmaterialInfo=getClearCoatInfo(materialInfo,normalInfo,f0_ior);\n#endif\n#ifdef MATERIAL_TRANSMISSION\nmaterialInfo=getTransmissionInfo(materialInfo);\n#endif\nmaterialInfo.perceptualRoughness=clamp(materialInfo.perceptualRoughness,0.0,1.0);materialInfo.metallic=clamp(materialInfo.metallic,0.0,1.0);materialInfo.alphaRoughness=materialInfo.perceptualRoughness*materialInfo.perceptualRoughness;float reflectance=max(max(materialInfo.f0.r,materialInfo.f0.g),materialInfo.f0.b);materialInfo.f90=vec3(clamp(reflectance*50.0,0.0,1.0));materialInfo.n=n;vec3 f_specular=vec3(0.0);vec3 f_diffuse=vec3(0.0);vec3 f_emissive=vec3(0.0);vec3 f_clearcoat=vec3(0.0);vec3 f_sheen=vec3(0.0);vec3 f_transmission=vec3(0.0);float albedoSheenScaling=1.0;\n#ifdef USE_IBL\nf_specular+=getIBLRadianceGGX(n,v,materialInfo.perceptualRoughness,materialInfo.f0);f_diffuse+=getIBLRadianceLambertian(n,materialInfo.albedoColor);\n#ifdef MATERIAL_CLEARCOAT\nf_clearcoat+=getIBLRadianceGGX(materialInfo.clearcoatNormal,v,materialInfo.clearcoatRoughness,materialInfo.clearcoatF0);\n#endif\n#ifdef MATERIAL_SHEEN\nf_sheen+=getIBLRadianceCharlie(n,v,materialInfo.sheenRoughnessFactor,materialInfo.sheenColorFactor);\n#endif\n#ifdef MATERIAL_TRANSMISSION\nvec2 normalizedFragCoord=vec2(0.0,0.0);normalizedFragCoord.x=gl_FragCoord.x/float(u_ScreenSize.x);normalizedFragCoord.y=gl_FragCoord.y/float(u_ScreenSize.y);f_transmission+=materialInfo.transmissionFactor*getIBLRadianceTransmission(n,u_Camera-v_Position,normalizedFragCoord,materialInfo.perceptualRoughness,materialInfo.baseColor,materialInfo.f0,materialInfo.f90);\n#endif\n#endif\nfloat ao=1.0;\n#ifdef HAS_OCCLUSION_MAP\nao=texture(u_OcclusionSampler,getOcclusionUV()).r;f_diffuse=mix(f_diffuse,f_diffuse*ao,u_OcclusionStrength);f_specular=mix(f_specular,f_specular*ao,u_OcclusionStrength);f_sheen=mix(f_sheen,f_sheen*ao,u_OcclusionStrength);f_clearcoat=mix(f_clearcoat,f_clearcoat*ao,u_OcclusionStrength);\n#endif\n#ifdef USE_PUNCTUAL\nfor(int i=0;i<LIGHT_COUNT;++i){Light light=u_Lights[i];vec3 pointToLight=-light.direction;float rangeAttenuation=1.0;float spotAttenuation=1.0;if(light.type!=LightType_Directional){pointToLight=light.position-v_Position;}if(light.type!=LightType_Directional){rangeAttenuation=getRangeAttenuation(light.range,length(pointToLight));}if(light.type==LightType_Spot){spotAttenuation=getSpotAttenuation(pointToLight,light.direction,light.outerConeCos,light.innerConeCos);}vec3 intensity=rangeAttenuation*spotAttenuation*light.intensity*light.color;vec3 l=normalize(pointToLight);vec3 h=normalize(l+v);float NdotL=clampedDot(n,l);float NdotV=clampedDot(n,v);float NdotH=clampedDot(n,h);float LdotH=clampedDot(l,h);float VdotH=clampedDot(v,h);if(NdotL>0.0||NdotV>0.0){f_diffuse+=intensity*NdotL*BRDF_lambertian(materialInfo.f0,materialInfo.f90,materialInfo.albedoColor,VdotH);f_specular+=intensity*NdotL*BRDF_specularGGX(materialInfo.f0,materialInfo.f90,materialInfo.alphaRoughness,VdotH,NdotL,NdotV,NdotH);\n#ifdef MATERIAL_SHEEN\nf_sheen+=intensity*getPunctualRadianceSheen(materialInfo.sheenColorFactor,materialInfo.sheenRoughnessFactor,NdotL,NdotV,NdotH);albedoSheenScaling=min(1.0-max3(materialInfo.sheenColorFactor)*albedoSheenScalingLUT(NdotV,materialInfo.sheenRoughnessFactor),1.0-max3(materialInfo.sheenColorFactor)*albedoSheenScalingLUT(NdotL,materialInfo.sheenRoughnessFactor));\n#endif\n#ifdef MATERIAL_CLEARCOAT\nf_clearcoat+=intensity*getPunctualRadianceClearCoat(materialInfo.clearcoatNormal,v,l,h,VdotH,materialInfo.clearcoatF0,materialInfo.clearcoatF90,materialInfo.clearcoatRoughness);\n#endif\n}\n#ifdef MATERIAL_TRANSMISSION\nf_transmission+=intensity*getPunctualRadianceTransmission(n,v,l,materialInfo.alphaRoughness,materialInfo.f0,materialInfo.f90,materialInfo.transmissionFactor,materialInfo.baseColor);\n#endif\n}\n#endif\nf_emissive=u_EmissiveFactor;\n#ifdef HAS_EMISSIVE_MAP\nf_emissive*=texture(u_EmissiveSampler,getEmissiveUV()).rgb;\n#endif\nvec3 color=vec3(0);float clearcoatFactor=0.0;vec3 clearcoatFresnel=vec3(0.0);\n#ifdef MATERIAL_CLEARCOAT\nclearcoatFactor=materialInfo.clearcoatFactor;clearcoatFresnel=F_Schlick(materialInfo.clearcoatF0,materialInfo.clearcoatF90,clampedDot(materialInfo.clearcoatNormal,v));\n#endif\n#ifdef MATERIAL_TRANSMISSION\nvec3 diffuse=mix(f_diffuse,f_transmission,materialInfo.transmissionFactor);\n#else\nvec3 diffuse=f_diffuse;\n#endif\ncolor=f_emissive+diffuse+f_specular;color=f_sheen+color*albedoSheenScaling;color=color*(1.0-clearcoatFactor*clearcoatFresnel)+f_clearcoat*clearcoatFactor;\n#ifndef DEBUG_OUTPUT\n#ifdef ALPHAMODE_MASK\nif(baseColor.a<u_AlphaCutoff){discard;}baseColor.a=1.0;\n#endif\ng_finalColor=vec4(toneMap(color),baseColor.a);\n#else\n#ifdef DEBUG_METALLIC\ng_finalColor.rgb=vec3(materialInfo.metallic);\n#endif\n#ifdef DEBUG_ROUGHNESS\ng_finalColor.rgb=vec3(materialInfo.perceptualRoughness);\n#endif\n#ifdef DEBUG_NORMAL\n#ifdef HAS_NORMAL_MAP\ng_finalColor.rgb=texture(u_NormalSampler,getNormalUV()).rgb;\n#else\ng_finalColor.rgb=vec3(0.5,0.5,1.0);\n#endif\n#endif\n#ifdef DEBUG_GEOMETRY_NORMAL\ng_finalColor.rgb=(normalInfo.ng+1.0)/2.0;\n#endif\n#ifdef DEBUG_WORLDSPACE_NORMAL\ng_finalColor.rgb=(n+1.0)/2.0;\n#endif\n#ifdef DEBUG_TANGENT\ng_finalColor.rgb=t*0.5+vec3(0.5);\n#endif\n#ifdef DEBUG_BITANGENT\ng_finalColor.rgb=b*0.5+vec3(0.5);\n#endif\n#ifdef DEBUG_BASECOLOR\ng_finalColor.rgb=linearTosRGB(materialInfo.baseColor);\n#endif\n#ifdef DEBUG_OCCLUSION\ng_finalColor.rgb=vec3(ao);\n#endif\n#ifdef DEBUG_F0\ng_finalColor.rgb=materialInfo.f0;\n#endif\n#ifdef DEBUG_FEMISSIVE\ng_finalColor.rgb=linearTosRGB(f_emissive);\n#endif\n#ifdef DEBUG_FSPECULAR\ng_finalColor.rgb=linearTosRGB(f_specular);\n#endif\n#ifdef DEBUG_FDIFFUSE\ng_finalColor.rgb=linearTosRGB(f_diffuse);\n#endif\n#ifdef DEBUG_FCLEARCOAT\ng_finalColor.rgb=linearTosRGB(f_clearcoat);\n#endif\n#ifdef DEBUG_FSHEEN\ng_finalColor.rgb=linearTosRGB(f_sheen);\n#endif\n#ifdef DEBUG_FTRANSMISSION\ng_finalColor.rgb=linearTosRGB(f_transmission);\n#endif\n#ifdef DEBUG_ALPHA\ng_finalColor.rgb=vec3(baseColor.a);\n#endif\ng_finalColor.a=1.0;\n#endif\n}"; // eslint-disable-line

var brdfShader = "#define GLSLIFY 1\nvec3 F_Schlick(vec3 f0,vec3 f90,float VdotH){return f0+(f90-f0)*pow(clamp(1.0-VdotH,0.0,1.0),5.0);}float V_GGX(float NdotL,float NdotV,float alphaRoughness){float alphaRoughnessSq=alphaRoughness*alphaRoughness;float GGXV=NdotL*sqrt(NdotV*NdotV*(1.0-alphaRoughnessSq)+alphaRoughnessSq);float GGXL=NdotV*sqrt(NdotL*NdotL*(1.0-alphaRoughnessSq)+alphaRoughnessSq);float GGX=GGXV+GGXL;if(GGX>0.0){return 0.5/GGX;}return 0.0;}float D_GGX(float NdotH,float alphaRoughness){float alphaRoughnessSq=alphaRoughness*alphaRoughness;float f=(NdotH*NdotH)*(alphaRoughnessSq-1.0)+1.0;return alphaRoughnessSq/(M_PI*f*f);}float lambdaSheenNumericHelper(float x,float alphaG){float oneMinusAlphaSq=(1.0-alphaG)*(1.0-alphaG);float a=mix(21.5473,25.3245,oneMinusAlphaSq);float b=mix(3.82987,3.32435,oneMinusAlphaSq);float c=mix(0.19823,0.16801,oneMinusAlphaSq);float d=mix(-1.97760,-1.27393,oneMinusAlphaSq);float e=mix(-4.32054,-4.85967,oneMinusAlphaSq);return a/(1.0+b*pow(x,c))+d*x+e;}float lambdaSheen(float cosTheta,float alphaG){if(abs(cosTheta)<0.5){return exp(lambdaSheenNumericHelper(cosTheta,alphaG));}else{return exp(2.0*lambdaSheenNumericHelper(0.5,alphaG)-lambdaSheenNumericHelper(1.0-cosTheta,alphaG));}}float V_Sheen(float NdotL,float NdotV,float sheenRoughness){sheenRoughness=max(sheenRoughness,0.000001);float alphaG=sheenRoughness*sheenRoughness;return clamp(1.0/((1.0+lambdaSheen(NdotV,alphaG)+lambdaSheen(NdotL,alphaG))*(4.0*NdotV*NdotL)),0.0,1.0);}float D_Charlie(float sheenRoughness,float NdotH){sheenRoughness=max(sheenRoughness,0.000001);float alphaG=sheenRoughness*sheenRoughness;float invR=1.0/alphaG;float cos2h=NdotH*NdotH;float sin2h=1.0-cos2h;return(2.0+invR)*pow(sin2h,invR*0.5)/(2.0*M_PI);}vec3 BRDF_lambertian(vec3 f0,vec3 f90,vec3 diffuseColor,float VdotH){return(1.0-F_Schlick(f0,f90,VdotH))*(diffuseColor/M_PI);}vec3 BRDF_specularGGX(vec3 f0,vec3 f90,float alphaRoughness,float VdotH,float NdotL,float NdotV,float NdotH){vec3 F=F_Schlick(f0,f90,VdotH);float Vis=V_GGX(NdotL,NdotV,alphaRoughness);float D=D_GGX(NdotH,alphaRoughness);return F*Vis*D;}vec3 BRDF_specularSheen(vec3 sheenColor,float sheenRoughness,float NdotL,float NdotV,float NdotH){float sheenDistribution=D_Charlie(sheenRoughness,NdotH);float sheenVisibility=V_Sheen(NdotL,NdotV,sheenRoughness);return sheenColor*sheenDistribution*sheenVisibility;}"; // eslint-disable-line

var iblShader = "#define GLSLIFY 1\nvec3 getDiffuseLight(vec3 n){return texture(u_LambertianEnvSampler,u_envRotation*n).rgb;}vec4 getSpecularSample(vec3 reflection,float lod){return textureLod(u_GGXEnvSampler,u_envRotation*reflection,lod);}vec4 getSheenSample(vec3 reflection,float lod){return textureLod(u_CharlieEnvSampler,u_envRotation*reflection,lod);}vec3 getIBLRadianceGGX(vec3 n,vec3 v,float perceptualRoughness,vec3 specularColor){float NdotV=clampedDot(n,v);float lod=clamp(perceptualRoughness*float(u_MipCount),0.0,float(u_MipCount));vec3 reflection=normalize(reflect(-v,n));vec2 brdfSamplePoint=clamp(vec2(NdotV,perceptualRoughness),vec2(0.0,0.0),vec2(1.0,1.0));vec2 brdf=texture(u_GGXLUT,brdfSamplePoint).rg;vec4 specularSample=getSpecularSample(reflection,lod);vec3 specularLight=specularSample.rgb;return specularLight*(specularColor*brdf.x+brdf.y);}vec3 getTransmissionSample(vec2 fragCoord,float perceptualRoughness){float framebufferLod=log2(float(u_TransmissionFramebufferSize.x))*perceptualRoughness;vec3 transmittedLight=textureLod(u_TransmissionFramebufferSampler,fragCoord.xy,framebufferLod).rgb;transmittedLight=sRGBToLinear(transmittedLight);return transmittedLight;}vec3 getIBLRadianceTransmission(vec3 n,vec3 v,vec2 fragCoord,float perceptualRoughness,vec3 baseColor,vec3 f0,vec3 f90){float NdotV=clampedDot(n,v);vec2 brdfSamplePoint=clamp(vec2(NdotV,perceptualRoughness),vec2(0.0,0.0),vec2(1.0,1.0));vec2 brdf=texture(u_GGXLUT,brdfSamplePoint).rg;vec3 specularColor=f0*brdf.x+f90*brdf.y;float lod=clamp(perceptualRoughness*float(u_MipCount),0.0,float(u_MipCount));vec3 transmissionVector=normalize(-v);vec3 transmittedLight=getTransmissionSample(fragCoord.xy,perceptualRoughness);return(1.0-specularColor)*transmittedLight*baseColor;}vec3 getIBLRadianceLambertian(vec3 n,vec3 diffuseColor){vec3 diffuseLight=getDiffuseLight(n);return diffuseLight*diffuseColor;}vec3 getIBLRadianceCharlie(vec3 n,vec3 v,float sheenRoughness,vec3 sheenColor){float NdotV=clampedDot(n,v);float lod=clamp(sheenRoughness*float(u_MipCount),0.0,float(u_MipCount));vec3 reflection=normalize(reflect(-v,n));vec2 brdfSamplePoint=clamp(vec2(NdotV,sheenRoughness),vec2(0.0,0.0),vec2(1.0,1.0));float brdf=texture(u_CharlieLUT,brdfSamplePoint).b;vec4 sheenSample=getSheenSample(reflection,lod);vec3 sheenLight=sheenSample.rgb;return sheenLight*sheenColor*brdf;}"; // eslint-disable-line

var punctualShader = "#define GLSLIFY 1\nstruct Light{vec3 direction;float range;vec3 color;float intensity;vec3 position;float innerConeCos;float outerConeCos;int type;float padding1;float padding2;};const int LightType_Directional=0;const int LightType_Point=1;const int LightType_Spot=2;float getRangeAttenuation(float range,float distance){if(range<=0.0){return 1.0/pow(distance,2.0);}return max(min(1.0-pow(distance/range,4.0),1.0),0.0)/pow(distance,2.0);}float getSpotAttenuation(vec3 pointToLight,vec3 spotDirection,float outerConeCos,float innerConeCos){float actualCos=dot(normalize(spotDirection),normalize(-pointToLight));if(actualCos>outerConeCos){if(actualCos<innerConeCos){return smoothstep(outerConeCos,innerConeCos,actualCos);}return 1.0;}return 0.0;}vec3 getPunctualRadianceTransmission(vec3 normal,vec3 view,vec3 pointToLight,float alphaRoughness,vec3 f0,vec3 f90,float transmissionPercentage,vec3 baseColor){vec3 n=normalize(normal);vec3 v=normalize(view);vec3 l=normalize(pointToLight);vec3 l_mirror=normalize(l+2.0*n*dot(-l,n));vec3 h=normalize(l_mirror+v);float D=D_GGX(clamp(dot(n,h),0.0,1.0),alphaRoughness);vec3 F=F_Schlick(f0,f90,clamp(dot(v,h),0.0,1.0));float T=transmissionPercentage;float Vis=V_GGX(clamp(dot(n,l_mirror),0.0,1.0),clamp(dot(n,v),0.0,1.0),alphaRoughness);vec3 f_transmission=(1.0-F)*T*baseColor*D*Vis;return f_transmission;}vec3 getPunctualRadianceClearCoat(vec3 clearcoatNormal,vec3 v,vec3 l,vec3 h,float VdotH,vec3 f0,vec3 f90,float clearcoatRoughness){float NdotL=clampedDot(clearcoatNormal,l);float NdotV=clampedDot(clearcoatNormal,v);float NdotH=clampedDot(clearcoatNormal,h);return NdotL*BRDF_specularGGX(f0,f90,clearcoatRoughness*clearcoatRoughness,VdotH,NdotL,NdotV,NdotH);}vec3 getPunctualRadianceSheen(vec3 sheenColor,float sheenRoughness,float NdotL,float NdotV,float NdotH){return NdotL*BRDF_specularSheen(sheenColor,sheenRoughness,NdotL,NdotV,NdotH);}"; // eslint-disable-line

var primitiveShader = "#define GLSLIFY 1\n#include <animation.glsl>\nin vec3 a_Position;out vec3 v_Position;\n#ifdef HAS_NORMALS\nin vec3 a_Normal;\n#endif\n#ifdef HAS_TANGENTS\nin vec4 a_Tangent;\n#endif\n#ifdef HAS_NORMALS\n#ifdef HAS_TANGENTS\nout mat3 v_TBN;\n#else\nout vec3 v_Normal;\n#endif\n#endif\n#ifdef HAS_UV_SET1\nin vec2 a_UV1;\n#endif\n#ifdef HAS_UV_SET2\nin vec2 a_UV2;\n#endif\nout vec2 v_UVCoord1;out vec2 v_UVCoord2;\n#ifdef HAS_VERTEX_COLOR_VEC3\nin vec3 a_Color;out vec3 v_Color;\n#endif\n#ifdef HAS_VERTEX_COLOR_VEC4\nin vec4 a_Color;out vec4 v_Color;\n#endif\nuniform mat4 u_ViewProjectionMatrix;uniform mat4 u_ModelMatrix;uniform mat4 u_NormalMatrix;vec4 getPosition(){vec4 pos=vec4(a_Position,1.0);\n#ifdef USE_MORPHING\npos+=getTargetPosition();\n#endif\n#ifdef USE_SKINNING\npos=getSkinningMatrix()*pos;\n#endif\nreturn pos;}\n#ifdef HAS_NORMALS\nvec3 getNormal(){vec3 normal=a_Normal;\n#ifdef USE_MORPHING\nnormal+=getTargetNormal();\n#endif\n#ifdef USE_SKINNING\nnormal=mat3(getSkinningNormalMatrix())*normal;\n#endif\nreturn normalize(normal);}\n#endif\n#ifdef HAS_TANGENTS\nvec3 getTangent(){vec3 tangent=a_Tangent.xyz;\n#ifdef USE_MORPHING\ntangent+=getTargetTangent();\n#endif\n#ifdef USE_SKINNING\ntangent=mat3(getSkinningMatrix())*tangent;\n#endif\nreturn normalize(tangent);}\n#endif\nvoid main(){vec4 pos=u_ModelMatrix*getPosition();v_Position=vec3(pos.xyz)/pos.w;\n#ifdef HAS_NORMALS\n#ifdef HAS_TANGENTS\nvec3 tangent=getTangent();vec3 normalW=normalize(vec3(u_NormalMatrix*vec4(getNormal(),0.0)));vec3 tangentW=normalize(vec3(u_ModelMatrix*vec4(tangent,0.0)));vec3 bitangentW=cross(normalW,tangentW)*a_Tangent.w;v_TBN=mat3(tangentW,bitangentW,normalW);\n#else\nv_Normal=normalize(vec3(u_NormalMatrix*vec4(getNormal(),0.0)));\n#endif\n#endif\nv_UVCoord1=vec2(0.0,0.0);v_UVCoord2=vec2(0.0,0.0);\n#ifdef HAS_UV_SET1\nv_UVCoord1=a_UV1;\n#endif\n#ifdef HAS_UV_SET2\nv_UVCoord2=a_UV2;\n#endif\n#if defined(HAS_VERTEX_COLOR_VEC3) || defined(HAS_VERTEX_COLOR_VEC4)\nv_Color=a_Color;\n#endif\ngl_Position=u_ViewProjectionMatrix*pos;}"; // eslint-disable-line

var texturesShader = "#define GLSLIFY 1\nin vec2 v_UVCoord1;in vec2 v_UVCoord2;uniform int u_MipCount;uniform samplerCube u_LambertianEnvSampler;uniform samplerCube u_GGXEnvSampler;uniform sampler2D u_GGXLUT;uniform samplerCube u_CharlieEnvSampler;uniform sampler2D u_CharlieLUT;uniform sampler2D u_SheenELUT;uniform mat3 u_envRotation;uniform sampler2D u_NormalSampler;uniform float u_NormalScale;uniform int u_NormalUVSet;uniform mat3 u_NormalUVTransform;uniform vec3 u_EmissiveFactor;uniform sampler2D u_EmissiveSampler;uniform int u_EmissiveUVSet;uniform mat3 u_EmissiveUVTransform;uniform sampler2D u_OcclusionSampler;uniform int u_OcclusionUVSet;uniform float u_OcclusionStrength;uniform mat3 u_OcclusionUVTransform;uniform sampler2D u_BaseColorSampler;uniform int u_BaseColorUVSet;uniform mat3 u_BaseColorUVTransform;uniform sampler2D u_MetallicRoughnessSampler;uniform int u_MetallicRoughnessUVSet;uniform mat3 u_MetallicRoughnessUVTransform;uniform sampler2D u_DiffuseSampler;uniform int u_DiffuseUVSet;uniform mat3 u_DiffuseUVTransform;uniform sampler2D u_SpecularGlossinessSampler;uniform int u_SpecularGlossinessUVSet;uniform mat3 u_SpecularGlossinessUVTransform;uniform sampler2D u_ClearcoatSampler;uniform int u_ClearcoatUVSet;uniform mat3 u_ClearcoatUVTransform;uniform sampler2D u_ClearcoatRoughnessSampler;uniform int u_ClearcoatRoughnessUVSet;uniform mat3 u_ClearcoatRoughnessUVTransform;uniform sampler2D u_ClearcoatNormalSampler;uniform int u_ClearcoatNormalUVSet;uniform mat3 u_ClearcoatNormalUVTransform;uniform sampler2D u_SheenColorSampler;uniform int u_SheenColorUVSet;uniform mat3 u_SheenColorUVTransform;uniform sampler2D u_SheenRoughnessSampler;uniform int u_SheenRoughnessUVSet;uniform mat3 u_SheenRoughnessUVTransform;uniform sampler2D u_TransmissionSampler;uniform int u_TransmissionUVSet;uniform mat3 u_TransmissionUVTransform;uniform sampler2D u_TransmissionFramebufferSampler;uniform ivec2 u_TransmissionFramebufferSize;vec2 getNormalUV(){vec3 uv=vec3(u_NormalUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_NORMAL_UV_TRANSFORM\nuv*=u_NormalUVTransform;\n#endif\nreturn uv.xy;}vec2 getEmissiveUV(){vec3 uv=vec3(u_EmissiveUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_EMISSIVE_UV_TRANSFORM\nuv*=u_EmissiveUVTransform;\n#endif\nreturn uv.xy;}vec2 getOcclusionUV(){vec3 uv=vec3(u_OcclusionUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_OCCLUSION_UV_TRANSFORM\nuv*=u_OcclusionUVTransform;\n#endif\nreturn uv.xy;}vec2 getBaseColorUV(){vec3 uv=vec3(u_BaseColorUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_BASECOLOR_UV_TRANSFORM\nuv*=u_BaseColorUVTransform;\n#endif\nreturn uv.xy;}vec2 getMetallicRoughnessUV(){vec3 uv=vec3(u_MetallicRoughnessUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_METALLICROUGHNESS_UV_TRANSFORM\nuv*=u_MetallicRoughnessUVTransform;\n#endif\nreturn uv.xy;}vec2 getSpecularGlossinessUV(){vec3 uv=vec3(u_SpecularGlossinessUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_SPECULARGLOSSINESS_UV_TRANSFORM\nuv*=u_SpecularGlossinessUVTransform;\n#endif\nreturn uv.xy;}vec2 getDiffuseUV(){vec3 uv=vec3(u_DiffuseUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_DIFFUSE_UV_TRANSFORM\nuv*=u_DiffuseUVTransform;\n#endif\nreturn uv.xy;}vec2 getClearcoatUV(){vec3 uv=vec3(u_ClearcoatUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_CLEARCOAT_UV_TRANSFORM\nuv*=u_ClearcoatUVTransform;\n#endif\nreturn uv.xy;}vec2 getClearcoatRoughnessUV(){vec3 uv=vec3(u_ClearcoatRoughnessUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_CLEARCOATROUGHNESS_UV_TRANSFORM\nuv*=u_ClearcoatRoughnessUVTransform;\n#endif\nreturn uv.xy;}vec2 getClearcoatNormalUV(){vec3 uv=vec3(u_ClearcoatNormalUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_CLEARCOATNORMAL_UV_TRANSFORM\nuv*=u_ClearcoatNormalUVTransform;\n#endif\nreturn uv.xy;}vec2 getSheenColorUV(){vec3 uv=vec3(u_SheenColorUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_SHEENCOLOR_UV_TRANSFORM\nuv*=u_SheenColorUVTransform;\n#endif\nreturn uv.xy;}vec2 getSheenRoughnessUV(){vec3 uv=vec3(u_SheenRoughnessUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_SHEENROUGHNESS_UV_TRANSFORM\nuv*=u_SheenRoughnessUVTransform;\n#endif\nreturn uv.xy;}vec2 getTransmissionUV(){vec3 uv=vec3(u_TransmissionUVSet<1 ? v_UVCoord1 : v_UVCoord2,1.0);\n#ifdef HAS_TRANSMISSION_UV_TRANSFORM\nuv*=u_TransmissionUVTransform;\n#endif\nreturn uv.xy;}"; // eslint-disable-line

var tonemappingShader = "#define GLSLIFY 1\nuniform float u_Exposure;const float GAMMA=2.2;const float INV_GAMMA=1.0/GAMMA;const mat3 ACESInputMat=mat3(0.59719,0.07600,0.02840,0.35458,0.90834,0.13383,0.04823,0.01566,0.83777);const mat3 ACESOutputMat=mat3(1.60475,-0.10208,-0.00327,-0.53108,1.10813,-0.07276,-0.07367,-0.00605,1.07602);vec3 linearTosRGB(vec3 color){return pow(color,vec3(INV_GAMMA));}vec3 sRGBToLinear(vec3 srgbIn){return vec3(pow(srgbIn.xyz,vec3(GAMMA)));}vec4 sRGBToLinear(vec4 srgbIn){return vec4(sRGBToLinear(srgbIn.xyz),srgbIn.w);}vec3 toneMapACESFast(vec3 color){color*=0.6;const float A=2.51;const float B=0.03;const float C=2.43;const float D=0.59;const float E=0.14;return clamp((color*(A*color+B))/(color*(C*color+D)+E),0.0,1.0);}vec3 RRTAndODTFit(vec3 color){vec3 a=color*(color+0.0245786)-0.000090537;vec3 b=color*(0.983729*color+0.4329510)+0.238081;return a/b;}vec3 toneMapACES(vec3 color){color=ACESInputMat*color;color=RRTAndODTFit(color);color=ACESOutputMat*color;color=clamp(color,0.0,1.0);return color;}vec3 toneMap(vec3 color){color*=u_Exposure;\n#ifdef TONEMAP_ACES_FAST\nreturn linearTosRGB(toneMapACESFast(color));\n#endif\n#ifdef TONEMAP_ACES\nreturn linearTosRGB(toneMapACES(color));\n#endif\nreturn linearTosRGB(color);}"; // eslint-disable-line

var shaderFunctions = "#define GLSLIFY 1\nconst float M_PI=3.141592653589793;in vec3 v_Position;\n#ifdef HAS_NORMALS\n#ifdef HAS_TANGENTS\nin mat3 v_TBN;\n#else\nin vec3 v_Normal;\n#endif\n#endif\n#ifdef HAS_VERTEX_COLOR_VEC3\nin vec3 v_Color;\n#endif\n#ifdef HAS_VERTEX_COLOR_VEC4\nin vec4 v_Color;\n#endif\nvec4 getVertexColor(){vec4 color=vec4(1.0,1.0,1.0,1.0);\n#ifdef HAS_VERTEX_COLOR_VEC3\ncolor.rgb=v_Color.rgb;\n#endif\n#ifdef HAS_VERTEX_COLOR_VEC4\ncolor=v_Color;\n#endif\nreturn color;}struct NormalInfo{vec3 ng;vec3 n;vec3 t;vec3 b;};float clampedDot(vec3 x,vec3 y){return clamp(dot(x,y),0.0,1.0);}float max3(vec3 v){return max(max(v.x,v.y),v.z);}"; // eslint-disable-line

var animationShader = "#define GLSLIFY 1\n#ifdef HAS_TARGET_POSITION0\nin vec3 a_Target_Position0;\n#endif\n#ifdef HAS_TARGET_POSITION1\nin vec3 a_Target_Position1;\n#endif\n#ifdef HAS_TARGET_POSITION2\nin vec3 a_Target_Position2;\n#endif\n#ifdef HAS_TARGET_POSITION3\nin vec3 a_Target_Position3;\n#endif\n#ifdef HAS_TARGET_POSITION4\nin vec3 a_Target_Position4;\n#endif\n#ifdef HAS_TARGET_POSITION5\nin vec3 a_Target_Position5;\n#endif\n#ifdef HAS_TARGET_POSITION6\nin vec3 a_Target_Position6;\n#endif\n#ifdef HAS_TARGET_POSITION7\nin vec3 a_Target_Position7;\n#endif\n#ifdef HAS_TARGET_NORMAL0\nin vec3 a_Target_Normal0;\n#endif\n#ifdef HAS_TARGET_NORMAL1\nin vec3 a_Target_Normal1;\n#endif\n#ifdef HAS_TARGET_NORMAL2\nin vec3 a_Target_Normal2;\n#endif\n#ifdef HAS_TARGET_NORMAL3\nin vec3 a_Target_Normal3;\n#endif\n#ifdef HAS_TARGET_TANGENT0\nin vec3 a_Target_Tangent0;\n#endif\n#ifdef HAS_TARGET_TANGENT1\nin vec3 a_Target_Tangent1;\n#endif\n#ifdef HAS_TARGET_TANGENT2\nin vec3 a_Target_Tangent2;\n#endif\n#ifdef HAS_TARGET_TANGENT3\nin vec3 a_Target_Tangent3;\n#endif\n#ifdef USE_MORPHING\nuniform float u_morphWeights[WEIGHT_COUNT];\n#endif\n#ifdef HAS_JOINT_SET1\nin vec4 a_Joint1;\n#endif\n#ifdef HAS_JOINT_SET2\nin vec4 a_Joint2;\n#endif\n#ifdef HAS_WEIGHT_SET1\nin vec4 a_Weight1;\n#endif\n#ifdef HAS_WEIGHT_SET2\nin vec4 a_Weight2;\n#endif\n#ifdef USE_SKINNING\nuniform mat4 u_jointMatrix[JOINT_COUNT];uniform mat4 u_jointNormalMatrix[JOINT_COUNT];\n#endif\n#ifdef USE_SKINNING\nmat4 getSkinningMatrix(){mat4 skin=mat4(0);\n#if defined(HAS_WEIGHT_SET1) && defined(HAS_JOINT_SET1)\nskin+=a_Weight1.x*u_jointMatrix[int(a_Joint1.x)]+a_Weight1.y*u_jointMatrix[int(a_Joint1.y)]+a_Weight1.z*u_jointMatrix[int(a_Joint1.z)]+a_Weight1.w*u_jointMatrix[int(a_Joint1.w)];\n#endif\n#if defined(HAS_WEIGHT_SET2) && defined(HAS_JOINT_SET2)\nskin+=a_Weight2.x*u_jointMatrix[int(a_Joint2.x)]+a_Weight2.y*u_jointMatrix[int(a_Joint2.y)]+a_Weight2.z*u_jointMatrix[int(a_Joint2.z)]+a_Weight2.w*u_jointMatrix[int(a_Joint2.w)];\n#endif\nreturn skin;}mat4 getSkinningNormalMatrix(){mat4 skin=mat4(0);\n#if defined(HAS_WEIGHT_SET1) && defined(HAS_JOINT_SET1)\nskin+=a_Weight1.x*u_jointNormalMatrix[int(a_Joint1.x)]+a_Weight1.y*u_jointNormalMatrix[int(a_Joint1.y)]+a_Weight1.z*u_jointNormalMatrix[int(a_Joint1.z)]+a_Weight1.w*u_jointNormalMatrix[int(a_Joint1.w)];\n#endif\n#if defined(HAS_WEIGHT_SET2) && defined(HAS_JOINT_SET2)\nskin+=a_Weight2.x*u_jointNormalMatrix[int(a_Joint2.x)]+a_Weight2.y*u_jointNormalMatrix[int(a_Joint2.y)]+a_Weight2.z*u_jointNormalMatrix[int(a_Joint2.z)]+a_Weight2.w*u_jointNormalMatrix[int(a_Joint2.w)];\n#endif\nreturn skin;}\n#endif\n#ifdef USE_MORPHING\nvec4 getTargetPosition(){vec4 pos=vec4(0);\n#ifdef HAS_TARGET_POSITION0\npos.xyz+=u_morphWeights[0]*a_Target_Position0;\n#endif\n#ifdef HAS_TARGET_POSITION1\npos.xyz+=u_morphWeights[1]*a_Target_Position1;\n#endif\n#ifdef HAS_TARGET_POSITION2\npos.xyz+=u_morphWeights[2]*a_Target_Position2;\n#endif\n#ifdef HAS_TARGET_POSITION3\npos.xyz+=u_morphWeights[3]*a_Target_Position3;\n#endif\n#ifdef HAS_TARGET_POSITION4\npos.xyz+=u_morphWeights[4]*a_Target_Position4;\n#endif\nreturn pos;}vec3 getTargetNormal(){vec3 normal=vec3(0);\n#ifdef HAS_TARGET_NORMAL0\nnormal+=u_morphWeights[0]*a_Target_Normal0;\n#endif\n#ifdef HAS_TARGET_NORMAL1\nnormal+=u_morphWeights[1]*a_Target_Normal1;\n#endif\n#ifdef HAS_TARGET_NORMAL2\nnormal+=u_morphWeights[2]*a_Target_Normal2;\n#endif\n#ifdef HAS_TARGET_NORMAL3\nnormal+=u_morphWeights[3]*a_Target_Normal3;\n#endif\n#ifdef HAS_TARGET_NORMAL4\nnormal+=u_morphWeights[4]*a_Target_Normal4;\n#endif\nreturn normal;}vec3 getTargetTangent(){vec3 tangent=vec3(0);\n#ifdef HAS_TARGET_TANGENT0\ntangent+=u_morphWeights[0]*a_Target_Tangent0;\n#endif\n#ifdef HAS_TARGET_TANGENT1\ntangent+=u_morphWeights[1]*a_Target_Tangent1;\n#endif\n#ifdef HAS_TARGET_TANGENT2\ntangent+=u_morphWeights[2]*a_Target_Tangent2;\n#endif\n#ifdef HAS_TARGET_TANGENT3\ntangent+=u_morphWeights[3]*a_Target_Tangent3;\n#endif\n#ifdef HAS_TARGET_TANGENT4\ntangent+=u_morphWeights[4]*a_Target_Tangent4;\n#endif\nreturn tangent;}\n#endif\n"; // eslint-disable-line

class gltfRenderer
{
    constructor(context)
    {
        this.shader = undefined; // current shader

        this.currentWidth = 0;
        this.currentHeight = 0;

        this.webGl = new gltfWebGl(context);

        // create render target for non transmission materials
        this.opaqueRenderTexture = 0;
        this.opaqueFramebuffer = 0;
        this.opaqueDepthTexture = 0;
        this.opaqueFramebufferWidth = 1024;
        this.opaqueFramebufferHeight = 1024;

        const shaderSources = new Map();
        shaderSources.set("primitive.vert", primitiveShader);
        shaderSources.set("pbr.frag", pbrShader);
        shaderSources.set("brdf.glsl", brdfShader);
        shaderSources.set("ibl.glsl", iblShader);
        shaderSources.set("punctual.glsl", punctualShader);
        shaderSources.set("tonemapping.glsl", tonemappingShader);
        shaderSources.set("textures.glsl", texturesShader);
        shaderSources.set("functions.glsl", shaderFunctions);
        shaderSources.set("animation.glsl", animationShader);

        this.shaderCache = new ShaderCache(shaderSources, this.webGl);

        let requiredWebglExtensions = [
            "EXT_texture_filter_anisotropic",
            "OES_texture_float_linear"
        ];

        this.webGl.loadWebGlExtensions(requiredWebglExtensions);

        this.visibleLights = [];

        this.viewMatrix = mat4.create();
        this.projMatrix = mat4.create();
        this.viewProjectionMatrix = mat4.create();

        this.currentCameraPosition = vec3.create();

        this.init();
    }

    /////////////////////////////////////////////////////////////////////
    // Render glTF scene graph
    /////////////////////////////////////////////////////////////////////

    // app state
    init()
    {
        const context = this.webGl.context;
        context.pixelStorei(GL.UNPACK_COLORSPACE_CONVERSION_WEBGL, GL.NONE);
        context.enable(GL.DEPTH_TEST);
        context.depthFunc(GL.LEQUAL);
        context.colorMask(true, true, true, true);
        context.clearDepth(1.0);

        this.opaqueRenderTexture = context.createTexture();
        context.bindTexture(context.TEXTURE_2D, this.opaqueRenderTexture);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.LINEAR_MIPMAP_LINEAR);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
        context.texImage2D( context.TEXTURE_2D,
                            0,
                            context.RGBA,
                            this.opaqueFramebufferWidth,
                            this.opaqueFramebufferHeight,
                            0,
                            context.RGBA,
                            context.UNSIGNED_BYTE,
                            null);
        context.bindTexture(context.TEXTURE_2D, null);

        this.opaqueDepthTexture = context.createTexture();
        context.bindTexture(context.TEXTURE_2D, this.opaqueDepthTexture);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MIN_FILTER, context.NEAREST);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_S, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_WRAP_T, context.CLAMP_TO_EDGE);
        context.texParameteri(context.TEXTURE_2D, context.TEXTURE_MAG_FILTER, context.NEAREST);
        context.texImage2D( context.TEXTURE_2D,
                            0,
                            context.DEPTH_COMPONENT16,
                            this.opaqueFramebufferWidth,
                            this.opaqueFramebufferHeight,
                            0,
                            context.DEPTH_COMPONENT,
                            context.UNSIGNED_SHORT,
                            null);
        context.bindTexture(context.TEXTURE_2D, null);

        this.opaqueFramebuffer = context.createFramebuffer();
        context.bindFramebuffer(context.FRAMEBUFFER, this.opaqueFramebuffer);
        context.framebufferTexture2D(context.FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.TEXTURE_2D, this.opaqueRenderTexture, 0);
        context.framebufferTexture2D(context.FRAMEBUFFER, context.DEPTH_ATTACHMENT, context.TEXTURE_2D, this.opaqueDepthTexture, 0);
        context.viewport(0, 0, this.currentWidth, this.currentHeight);
        context.bindFramebuffer(context.FRAMEBUFFER, null);

    }

    resize(width, height)
    {
        if (this.currentWidth !== width || this.currentHeight !== height)
        {
            this.currentHeight = height;
            this.currentWidth = width;
            this.webGl.context.viewport(0, 0, width, height);
        }
    }

    // frame state
    clearFrame(clearColor)
    {
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, null);
        this.webGl.context.clearColor(clearColor[0] / 255.0, clearColor[1] / 255.0, clearColor[2] / 255.0, 1.0);
        this.webGl.context.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, this.opaqueFramebuffer);
        this.webGl.context.clearColor(clearColor[0] / 255.0, clearColor[1] / 255.0, clearColor[2] / 255.0, 1.0);
        this.webGl.context.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, null);
    }

    // render complete gltf scene with given camera
    drawScene(state, scene)
    {
        let currentCamera = undefined;

        if (state.cameraIndex === undefined)
        {
            currentCamera = state.userCamera;
        }
        else
        {
            currentCamera = state.gltf.cameras[state.cameraIndex].clone();
        }

        currentCamera.aspectRatio = this.currentWidth / this.currentHeight;

        this.projMatrix = currentCamera.getProjectionMatrix();
        this.viewMatrix = currentCamera.getViewMatrix(state.gltf);
        this.currentCameraPosition = currentCamera.getPosition(state.gltf);

        this.visibleLights = this.getVisibleLights(state.gltf, scene);

        mat4.multiply(this.viewProjectionMatrix, this.projMatrix, this.viewMatrix);

        const nodes = scene.gatherNodes(state.gltf);

        // Update skins.
        for (const node of nodes)
        {
            if (node.mesh !== undefined && node.skin !== undefined)
            {
                this.updateSkin(state, node);
            }
        }

        // collect drawables by essentially zipping primitives (for geometry and material)
        // and nodes for the transform
        const drawables = nodes
            .filter(node => node.mesh !== undefined)
            .reduce((acc, node) => acc.concat(state.gltf.meshes[node.mesh].primitives.map( primitive => {
                return  {node: node, primitive: primitive};
            })), [])
            .filter(({node, primitive}) => primitive.material !== undefined);

        // opaque drawables don't need sorting
        const opaqueDrawables = drawables
            .filter(({node, primitive}) => state.gltf.materials[primitive.material].alphaMode !== "BLEND"
                && (state.gltf.materials[primitive.material].extensions === undefined
                    || state.gltf.materials[primitive.material].extensions.KHR_materials_transmission === undefined));

        // transparent drawables need sorting before they can be drawn
        let transparentDrawables = drawables
            .filter(({node, primitive}) => state.gltf.materials[primitive.material].alphaMode === "BLEND"
                && (state.gltf.materials[primitive.material].extensions === undefined
                    || state.gltf.materials[primitive.material].extensions.KHR_materials_transmission === undefined));
        transparentDrawables = currentCamera.sortPrimitivesByDepth(state.gltf, transparentDrawables);

        // Render transmission sample texture
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, this.opaqueFramebuffer);

        this.webGl.context.viewport(0, 0, this.opaqueFramebufferWidth, this.opaqueFramebufferHeight);
        for (const drawable of opaqueDrawables)
        {
            this.drawPrimitive(state, drawable.primitive, drawable.node, this.viewProjectionMatrix);
        }
        for (const drawable of transparentDrawables)
        {
            this.drawPrimitive(state, drawable.primitive, drawable.node, this.viewProjectionMatrix);
        }

        //Reset Viewport
        this.webGl.context.viewport(0, 0,  this.currentWidth, this.currentHeight);

        //Create Framebuffer Mipmaps
        this.webGl.context.bindTexture(this.webGl.context.TEXTURE_2D, this.opaqueRenderTexture);
        this.webGl.context.generateMipmap(this.webGl.context.TEXTURE_2D);

        // Render to canvas
        this.webGl.context.bindFramebuffer(this.webGl.context.FRAMEBUFFER, null);
        for (const drawable of opaqueDrawables)
        {
            this.drawPrimitive(state, drawable.primitive, drawable.node, this.viewProjectionMatrix);
        }
        for (const drawable of transparentDrawables)
        {
            this.drawPrimitive(state, drawable.primitive, drawable.node, this.viewProjectionMatrix);
        }

        // filter materials with transmission extension
        let transmissionDrawables = drawables
            .filter(({node, primitive}) => state.gltf.materials[primitive.material].extensions !== undefined
                && state.gltf.materials[primitive.material].extensions.KHR_materials_transmission !== undefined);
        transmissionDrawables = currentCamera.sortPrimitivesByDepth(state.gltf, transmissionDrawables);
        for (const drawable of transmissionDrawables)
        {
            this.drawPrimitive(state, drawable.primitive, drawable.node, this.viewProjectionMatrix, this.opaqueRenderTexture);
        }
    }

    // vertices with given material
    drawPrimitive(state, primitive, node, viewProjectionMatrix, transmissionSampleTexture)
    {
        if (primitive.skip) return;

        let material;
        if(primitive.mappings !== undefined && state.variant != "default")
        {
            const names = state.gltf.variants.map(obj => obj.name);
            const idx = names.indexOf(state.variant);
            let materialIdx = primitive.material;
            primitive.mappings.forEach(element => {
                if(element.variants.indexOf(idx) >= 0)
                {
                    materialIdx = element.material;
                }
            });
            material = state.gltf.materials[materialIdx];
        }
        else
        {
            material = state.gltf.materials[primitive.material];
        }

        //select shader permutation, compile and link program.

        let vertDefines = [];
        this.pushVertParameterDefines(vertDefines, state.renderingParameters, state.gltf, node, primitive);
        vertDefines = primitive.getDefines().concat(vertDefines);

        let fragDefines = material.getDefines().concat(vertDefines);
        this.pushFragParameterDefines(fragDefines, state);

        const fragmentHash = this.shaderCache.selectShader(material.getShaderIdentifier(), fragDefines);
        const vertexHash = this.shaderCache.selectShader(primitive.getShaderIdentifier(), vertDefines);

        if (fragmentHash && vertexHash)
        {
            this.shader = this.shaderCache.getShaderProgram(fragmentHash, vertexHash);
        }

        if (this.shader === undefined)
        {
            return;
        }

        this.webGl.context.useProgram(this.shader.program);

        if (state.renderingParameters.usePunctual)
        {
            this.applyLights(state.gltf);
        }

        // update model dependant matrices once per node
        this.shader.updateUniform("u_ViewProjectionMatrix", viewProjectionMatrix);
        this.shader.updateUniform("u_ModelMatrix", node.worldTransform);
        this.shader.updateUniform("u_NormalMatrix", node.normalMatrix, false);
        this.shader.updateUniform("u_Exposure", state.renderingParameters.exposure, false);
        this.shader.updateUniform("u_Camera", this.currentCameraPosition, false);

        this.updateAnimationUniforms(state, node, primitive);

        if (mat4.determinant(node.worldTransform) < 0.0)
        {
            this.webGl.context.frontFace(GL.CW);
        }
        else
        {
            this.webGl.context.frontFace(GL.CCW);
        }

        if (material.doubleSided)
        {
            this.webGl.context.disable(GL.CULL_FACE);
        }
        else
        {
            this.webGl.context.enable(GL.CULL_FACE);
        }

        if (material.alphaMode === 'BLEND')
        {
            this.webGl.context.enable(GL.BLEND);
            this.webGl.context.blendFuncSeparate(GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA, GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA);
            this.webGl.context.blendEquation(GL.FUNC_ADD);
        }
        else
        {
            this.webGl.context.disable(GL.BLEND);
        }

        const drawIndexed = primitive.indices !== undefined;
        if (drawIndexed)
        {
            if (!this.webGl.setIndices(state.gltf, primitive.indices))
            {
                return;
            }
        }

        let vertexCount = 0;
        for (const attribute of primitive.glAttributes)
        {
            const gltfAccessor = state.gltf.accessors[attribute.accessor];
            vertexCount = gltfAccessor.count;

            const location = this.shader.getAttributeLocation(attribute.name);
            if (location < 0)
            {
                continue; // only skip this attribute
            }
            if (!this.webGl.enableAttribute(state.gltf, location, gltfAccessor))
            {
                return; // skip this primitive
            }
        }

        for (let [uniform, val] of material.getProperties().entries())
        {
            this.shader.updateUniform(uniform, val);
        }

        for (let i = 0; i < material.textures.length; ++i)
        {
            let info = material.textures[i];
            const location = this.shader.getUniformLocation(info.samplerName);
            if (location < 0)
            {
                continue; // only skip this texture
            }
            if (!this.webGl.setTexture(location, state.gltf, info, i)) // binds texture and sampler
            {
                return; // skip this material
            }
        }

        let textureCount = material.textures.length;
        if (state.renderingParameters.useIBL && state.environment !== undefined)
        {
            textureCount = this.applyEnvironmentMap(state, textureCount);
        }

        if (state.renderingParameters.usePunctual && state.environment !== undefined)
        {
            this.webGl.setTexture(this.shader.getUniformLocation("u_SheenELUT"), state.gltf, state.environment.sheenELUT, textureCount++);
        }

        if(transmissionSampleTexture !== undefined && state.renderingParameters.useIBL && state.environment)
        {
            this.webGl.context.activeTexture(GL.TEXTURE0 + textureCount);
            this.webGl.context.bindTexture(this.webGl.context.TEXTURE_2D, this.opaqueRenderTexture);
            this.webGl.context.uniform1i(this.shader.getUniformLocation("u_TransmissionFramebufferSampler"), textureCount);
            textureCount++;

            this.webGl.context.uniform2i(this.shader.getUniformLocation("u_ScreenSize"), this.currentWidth, this.currentHeight);
            this.webGl.context.uniform2i(this.shader.getUniformLocation("u_TransmissionFramebufferSize"), this.opaqueFramebufferWidth, this.opaqueFramebufferHeight);
        }

        if (drawIndexed)
        {
            const indexAccessor = state.gltf.accessors[primitive.indices];
            this.webGl.context.drawElements(primitive.mode, indexAccessor.count, indexAccessor.componentType, 0);
        }
        else
        {
            this.webGl.context.drawArrays(primitive.mode, 0, vertexCount);
        }

        for (const attribute of primitive.glAttributes)
        {
            const location = this.shader.getAttributeLocation(attribute.name);
            if (location < 0)
            {
                continue; // skip this attribute
            }
            this.webGl.context.disableVertexAttribArray(location);
        }
    }

    // returns all lights that are relevant for rendering or the default light if there are none
    getVisibleLights(gltf, scene)
    {
        let lights = [];
        for (let light of gltf.lights)
        {
            if (light.node !== undefined)
            {
                if (scene.includesNode(gltf, light.node))
                {
                    lights.push(light);
                }
            }
        }
        return lights;
    }

    updateSkin(state, node)
    {
        if (state.renderingParameters.skinning && state.gltf.skins !== undefined)
        {
            const skin = state.gltf.skins[node.skin];
            skin.computeJoints(state.gltf, node);
        }
    }

    pushVertParameterDefines(vertDefines, parameters, gltf, node, primitive)
    {
        // skinning
        if (parameters.skinning && node.skin !== undefined && primitive.hasWeights && primitive.hasJoints)
        {
            const skin = gltf.skins[node.skin];

            vertDefines.push("USE_SKINNING 1");
            vertDefines.push("JOINT_COUNT " + skin.jointMatrices.length);
        }

        // morphing
        if (parameters.morphing && node.mesh !== undefined && primitive.targets.length > 0)
        {
            const mesh = gltf.meshes[node.mesh];
            if (mesh.weights !== undefined && mesh.weights.length > 0)
            {
                vertDefines.push("USE_MORPHING 1");
                vertDefines.push("WEIGHT_COUNT " + Math.min(mesh.weights.length, 8));
            }
        }
    }

    updateAnimationUniforms(state, node, primitive)
    {
        if (state.renderingParameters.skinning && node.skin !== undefined && primitive.hasWeights && primitive.hasJoints)
        {
            const skin = state.gltf.skins[node.skin];

            this.shader.updateUniform("u_jointMatrix", skin.jointMatrices);
            if(primitive.hasNormals)
            {
                this.shader.updateUniform("u_jointNormalMatrix", skin.jointNormalMatrices);
            }
        }

        if (state.renderingParameters.morphing && node.mesh !== undefined && primitive.targets.length > 0)
        {
            const mesh = state.gltf.meshes[node.mesh];
            if (mesh.weights !== undefined && mesh.weights.length > 0)
            {
                this.shader.updateUniformArray("u_morphWeights", mesh.weights);
            }
        }
    }

    pushFragParameterDefines(fragDefines, state)
    {
        if (state.renderingParameters.usePunctual)
        {
            fragDefines.push("USE_PUNCTUAL 1");
            fragDefines.push("LIGHT_COUNT " + this.visibleLights.length);
        }

        if (state.renderingParameters.useIBL && state.environment)
        {
            fragDefines.push("USE_IBL 1");
        }

        switch (state.renderingParameters.toneMap)
        {
        case (ToneMaps.ACES_FAST):
            fragDefines.push("TONEMAP_ACES_FAST 1");
            break;
        case (ToneMaps.ACES):
            fragDefines.push("TONEMAP_ACES 1");
            break;
        }

        if (state.renderingParameters.debugOutput !== DebugOutput.NONE)
        {
            fragDefines.push("DEBUG_OUTPUT 1");
        }

        switch (state.renderingParameters.debugOutput)
        {
        case (DebugOutput.METALLIC):
            fragDefines.push("DEBUG_METALLIC 1");
            break;
        case (DebugOutput.ROUGHNESS):
            fragDefines.push("DEBUG_ROUGHNESS 1");
            break;
        case (DebugOutput.NORMAL):
            fragDefines.push("DEBUG_NORMAL 1");
            break;
        case (DebugOutput.WORLDSPACENORMAL):
            fragDefines.push("DEBUG_WORLDSPACE_NORMAL 1");
            break;
        case (DebugOutput.GEOMETRYNORMAL):
            fragDefines.push("DEBUG_GEOMETRY_NORMAL 1");
            break;
        case (DebugOutput.TANGENT):
            fragDefines.push("DEBUG_TANGENT 1");
            break;
        case (DebugOutput.BITANGENT):
            fragDefines.push("DEBUG_BITANGENT 1");
            break;
        case (DebugOutput.BASECOLOR):
            fragDefines.push("DEBUG_BASECOLOR 1");
            break;
        case (DebugOutput.OCCLUSION):
            fragDefines.push("DEBUG_OCCLUSION 1");
            break;
        case (DebugOutput.EMISSIVE):
            fragDefines.push("DEBUG_FEMISSIVE 1");
            break;
        case (DebugOutput.SPECULAR):
            fragDefines.push("DEBUG_FSPECULAR 1");
            break;
        case (DebugOutput.DIFFUSE):
            fragDefines.push("DEBUG_FDIFFUSE 1");
            break;
        case (DebugOutput.THICKNESS):
            fragDefines.push("DEBUG_THICKNESS 1");
            break;
        case (DebugOutput.CLEARCOAT):
            fragDefines.push("DEBUG_FCLEARCOAT 1");
            break;
        case (DebugOutput.SHEEN):
            fragDefines.push("DEBUG_FSHEEN 1");
            break;
        case (DebugOutput.SUBSURFACE):
            fragDefines.push("DEBUG_FSUBSURFACE 1");
            break;
        case (DebugOutput.TRANSMISSION):
            fragDefines.push("DEBUG_FTRANSMISSION 1");
            break;
        case (DebugOutput.F0):
            fragDefines.push("DEBUG_F0 1");
            break;
        case (DebugOutput.ALPHA):
            fragDefines.push("DEBUG_ALPHA 1");
            break;
        }
    }

    applyLights(gltf)
    {
        let uniformLights = [];
        for (let light of this.visibleLights)
        {
            uniformLights.push(light.toUniform(gltf));
        }

        if (uniformLights.length > 0)
        {
            this.shader.updateUniform("u_Lights", uniformLights);
        }
    }

    applyEnvironmentMap(state, texSlotOffset)
    {
        const environment = state.environment;
        this.webGl.setTexture(this.shader.getUniformLocation("u_LambertianEnvSampler"), environment, environment.diffuseEnvMap, texSlotOffset++);

        this.webGl.setTexture(this.shader.getUniformLocation("u_GGXEnvSampler"), environment, environment.specularEnvMap, texSlotOffset++);
        this.webGl.setTexture(this.shader.getUniformLocation("u_GGXLUT"), environment, environment.lut, texSlotOffset++);

        this.webGl.setTexture(this.shader.getUniformLocation("u_CharlieEnvSampler"), environment, environment.sheenEnvMap, texSlotOffset++);
        this.webGl.setTexture(this.shader.getUniformLocation("u_CharlieLUT"), environment, environment.sheenLUT, texSlotOffset++);

        this.shader.updateUniform("u_MipCount", environment.mipCount);

        let rotMatrix4 = mat4.create();
        mat4.rotateY(rotMatrix4, rotMatrix4,  state.renderingParameters.environmentRotation / 180.0 * Math.PI);
        let rotMatrix3 = mat3.create();
        mat3.fromMat4(rotMatrix3, rotMatrix4);
        this.shader.updateUniform("u_envRotation", rotMatrix3);

        return texSlotOffset;
    }

    destroy()
    {
        this.shaderCache.destroy();
    }
}

class GltfView
{
    constructor(context, ui)
    {
        this.ui = ui;
        this.context = context;
        this.renderer = new gltfRenderer(this.context);
    }

    createState()
    {
        return new GltfState();
    }

    updateCanvas(canvas)
    {
        if(this.ui !== undefined)
        {
            canvas.width = window.innerWidth - this.ui.getBoundingClientRect().width;
        }
        else
        {
            canvas.width = canvas.clientWidth;
        }
        canvas.height = canvas.clientHeight;
    }
    
    updateViewport(width, height)
    {
        this.renderer.resize(width, height);
    }
    
    renderFrame(state)
    {

        this.renderer.clearFrame(state.renderingParameters.clearColor);

        if(state.gltf === undefined)
        {
            return;
        }

        const scene = state.gltf.scenes[state.sceneIndex];

        scene.applyTransformHierarchy(state.gltf);

        this.renderer.drawScene(state, scene);
    }
    animate(state)
    {
        if(state.gltf === undefined)
        {
            return;
        }

        if(state.gltf.animations !== undefined && state.animationIndices !== undefined && !state.animationTimer.paused)
        {
            const t = state.animationTimer.elapsedSec();

            const animations = state.animationIndices.map(index => {
                return state.gltf.animations[index];
            }).filter(animation => animation !== undefined);

            for(const animation of animations)
            {
                animation.advance(state.gltf, t);
            }
        }
    }

    // gatherStatistics collects information about the GltfState such as the number of rendererd meshes or triangles
    gatherStatistics(state)
    {
        if(state.gltf === undefined)
        {
            return;
        }

        // gather information from the active scene
        const scene = state.gltf.scenes[state.sceneIndex];
        const nodes = scene.gatherNodes(state.gltf);
        const activeMeshes = nodes.filter(node => node.mesh !== undefined).map(node => state.gltf.meshes[node.mesh]);
        const activePrimitives = activeMeshes
            .reduce((acc, mesh) => acc.concat(mesh.primitives), [])
            .filter(primitive => primitive.material !== undefined);
        const activeMaterials = [... new Set(activePrimitives.map(primitive => state.gltf.materials[primitive.material]))];
        const opaqueMaterials = activeMaterials.filter(material => material.alphaMode !== "BLEND");
        const transparentMaterials = activeMaterials.filter(material => material.alphaMode === "BLEND");
        const faceCount = activePrimitives
            .map(primitive => {
                const verticesCount = state.gltf.accessors[primitive.indices].count;
                if (verticesCount === 0)
                {
                    return 0;
                }

                // convert vertex count to point, line or triangle count
                switch (primitive.mode) {
                case GL.POINTS:
                    return verticesCount;
                case GL.LINES:
                    return verticesCount / 2;
                case GL.LINE_LOOP:
                    return verticesCount;
                case GL.LINE_STRIP:
                    return verticesCount - 1;
                case GL.TRIANGLES:
                    return verticesCount / 3;
                case GL.TRIANGLE_STRIP:
                case GL.TRIANGLE_FAN:
                    return verticesCount - 2;
                }
            })
            .reduce((acc, faceCount) => acc += faceCount);

        // assemble statistics object
        return {
            meshCount: activeMeshes.length,
            faceCount: faceCount,
            opaqueMaterialsCount: opaqueMaterials.length,
            transparentMaterialsCount: transparentMaterials.length
        };
    }

    async startRendering(state, canvas)
    {
        const update = () =>
        {
            this.animate(state);
            this.updateCanvas(canvas);
            this.updateViewport(canvas.width, canvas.height);
            this.renderFrame(state);
            window.requestAnimationFrame(update);
        };

        // After this start executing render loop.
        window.requestAnimationFrame(update);
    }
}

class gltfAccessor extends GltfObject
{
    constructor()
    {
        super();
        this.bufferView = undefined;
        this.byteOffset = 0;
        this.componentType = undefined;
        this.normalized = false;
        this.count = undefined;
        this.type = undefined;
        this.max = undefined;
        this.min = undefined;
        this.sparse = undefined;
        this.name = undefined;

        // non gltf
        this.glBuffer = undefined;
        this.typedView = undefined;
        this.filteredView = undefined;
    }

    getTypedView(gltf)
    {
        if (this.typedView !== undefined)
        {
            return this.typedView;
        }

        if (this.bufferView !== undefined)
        {
            const bufferView = gltf.bufferViews[this.bufferView];
            const buffer = gltf.buffers[bufferView.buffer];
            const byteOffset = this.byteOffset + bufferView.byteOffset;

            const componentSize = this.getComponentSize(this.componentType);
            let componentCount = this.getComponentCount(this.type);

            let arrayLength = 0;
            if(bufferView.byteStride !== 0)
            {
                if (componentSize !== 0)
                {
                    arrayLength = bufferView.byteStride / componentSize * (this.count - 1) + componentCount;
                }
                else
                {
                    console.warn("Invalid component type in accessor '" + (this.name ? this.name : "") + "'");
                }
            }
            else
            {
                arrayLength = this.count * componentCount;
            }

            if (arrayLength * componentSize > buffer.buffer.byteLength - byteOffset)
            {
                arrayLength = (buffer.buffer.byteLength - byteOffset) / componentSize;
                console.warn("Count in accessor '" + (this.name ? this.name : "") + "' is too large.");
            }

            switch (this.componentType)
            {
            case GL.BYTE:
                this.typedView = new Int8Array(buffer.buffer, byteOffset, arrayLength);
                break;
            case GL.UNSIGNED_BYTE:
                this.typedView = new Uint8Array(buffer.buffer, byteOffset, arrayLength);
                break;
            case GL.SHORT:
                this.typedView = new Int16Array(buffer.buffer, byteOffset, arrayLength);
                break;
            case GL.UNSIGNED_SHORT:
                this.typedView = new Uint16Array(buffer.buffer, byteOffset, arrayLength);
                break;
            case GL.UNSIGNED_INT:
                this.typedView = new Uint32Array(buffer.buffer, byteOffset, arrayLength);
                break;
            case GL.FLOAT:
                this.typedView = new Float32Array(buffer.buffer, byteOffset, arrayLength);
                break;
            }
        }

        if (this.typedView === undefined)
        {
            console.warn("Failed to convert buffer view to typed view!: " + this.bufferView);
        }
        else if (this.sparse !== undefined)
        {
            this.applySparse(gltf, this.typedView);
        }

        return this.typedView;
    }

    getDeinterlacedView(gltf)
    {
        if (this.filteredView !== undefined)
        {
            return this.filteredView;
        }

        if (this.bufferView !== undefined)
        {
            const bufferView = gltf.bufferViews[this.bufferView];
            const buffer = gltf.buffers[bufferView.buffer];
            const byteOffset = this.byteOffset + bufferView.byteOffset;

            const componentSize = this.getComponentSize(this.componentType);
            const componentCount = this.getComponentCount(this.type);
            const arrayLength = this.count * componentCount;

            let stride = bufferView.byteStride !== 0 ? bufferView.byteStride : componentCount * componentSize;
            let dv = new DataView(buffer.buffer, byteOffset, this.count * stride);

            let func = 'getFloat32';
            switch (this.componentType)
            {
            case GL.BYTE:
                this.filteredView = new Int8Array(arrayLength);
                func = 'getInt8';
                break;
            case GL.UNSIGNED_BYTE:
                this.filteredView = new Uint8Array(arrayLength);
                func = 'getUint8';
                break;
            case GL.SHORT:
                this.filteredView = new Int16Array(arrayLength);
                func = 'getInt16';
                break;
            case GL.UNSIGNED_SHORT:
                this.filteredView = new Uint16Array(arrayLength);
                func = 'getUint16';
                break;
            case GL.UNSIGNED_INT:
                this.filteredView = new Uint32Array(arrayLength);
                func = 'getUint32';
                break;
            case GL.FLOAT:
                this.filteredView = new Float32Array(arrayLength);
                func = 'getFloat32';
                break;
            }

            for(let i = 0; i < arrayLength; ++i)
            {
                let offset = Math.floor(i/componentCount) * stride + (i % componentCount) * componentSize;
                this.filteredView[i] = dv[func](offset, true);
            }
        }

        if (this.filteredView === undefined)
        {
            console.warn("Failed to convert buffer view to filtered view!: " + this.bufferView);
        }
        else if (this.sparse !== undefined)
        {
            this.applySparse(gltf, this.filteredView);
        }

        return this.filteredView;
    }

    applySparse(gltf, view)
    {
        // Gather indices.

        const indicesBufferView = gltf.bufferViews[this.sparse.indices.bufferView];
        const indicesBuffer = gltf.buffers[indicesBufferView.buffer];
        const indicesByteOffset = this.sparse.indices.byteOffset + indicesBufferView.byteOffset;

        const indicesComponentSize = this.getComponentSize(this.sparse.indices.componentType);
        let indicesComponentCount = 1;

        if(indicesBufferView.byteStride !== 0)
        {
            indicesComponentCount = indicesBufferView.byteStride / indicesComponentSize;
        }

        const indicesArrayLength = this.sparse.count * indicesComponentCount;

        let indicesTypedView;
        switch (this.sparse.indices.componentType)
        {
        case GL.UNSIGNED_BYTE:
            indicesTypedView = new Uint8Array(indicesBuffer.buffer, indicesByteOffset, indicesArrayLength);
            break;
        case GL.UNSIGNED_SHORT:
            indicesTypedView = new Uint16Array(indicesBuffer.buffer, indicesByteOffset, indicesArrayLength);
            break;
        case GL.UNSIGNED_INT:
            indicesTypedView = new Uint32Array(indicesBuffer.buffer, indicesByteOffset, indicesArrayLength);
            break;
        }

        // Gather values.

        const valuesBufferView = gltf.bufferViews[this.sparse.values.bufferView];
        const valuesBuffer = gltf.buffers[valuesBufferView.buffer];
        const valuesByteOffset = this.sparse.values.byteOffset + valuesBufferView.byteOffset;

        const valuesComponentSize = this.getComponentSize(this.componentType);
        let valuesComponentCount = this.getComponentCount(this.type);

        if(valuesBufferView.byteStride !== 0)
        {
            valuesComponentCount = valuesBufferView.byteStride / valuesComponentSize;
        }

        const valuesArrayLength = this.sparse.count * valuesComponentCount;

        let valuesTypedView;
        switch (this.componentType)
        {
        case GL.BYTE:
            valuesTypedView = new Int8Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        case GL.UNSIGNED_BYTE:
            valuesTypedView = new Uint8Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        case GL.SHORT:
            valuesTypedView = new Int16Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        case GL.UNSIGNED_SHORT:
            valuesTypedView = new Uint16Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        case GL.UNSIGNED_INT:
            valuesTypedView = new Uint32Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        case GL.FLOAT:
            valuesTypedView = new Float32Array(valuesBuffer.buffer, valuesByteOffset, valuesArrayLength);
            break;
        }

        // Overwrite values.

        for(let i = 0; i < this.sparse.count; ++i)
        {
            for(let k = 0; k < valuesComponentCount; ++k)
            {
                view[indicesTypedView[i] * valuesComponentCount + k] = valuesTypedView[i * valuesComponentCount + k];
            }
        }
    }

    getComponentCount(type)
    {
        return CompononentCount.get(type);
    }

    getComponentSize(componentType)
    {
        switch (componentType)
        {
        case GL.BYTE:
        case GL.UNSIGNED_BYTE:
            return 1;
        case GL.SHORT:
        case GL.UNSIGNED_SHORT:
            return 2;
        case GL.UNSIGNED_INT:
        case GL.FLOAT:
            return 4;
        default:
            return 0;
        }
    }

    destroy()
    {
        if (this.glBuffer !== undefined)
        {
            // TODO: this breaks the dependency direction
            WebGl.context.deleteBuffer(this.glBuffer);
        }

        this.glBuffer = undefined;
    }
}

const CompononentCount = new Map(
    [
        ["SCALAR", 1],
        ["VEC2", 2],
        ["VEC3", 3],
        ["VEC4", 4],
        ["MAT2", 4],
        ["MAT3", 9],
        ["MAT4", 16]
    ]
);

class gltfBuffer extends GltfObject
{
    constructor()
    {
        super();
        this.uri = undefined;
        this.byteLength = undefined;
        this.name = undefined;

        // non gltf
        this.buffer = undefined; // raw data blob
    }

    load(gltf, additionalFiles = undefined)
    {
        if (this.buffer !== undefined)
        {
            console.error("buffer has already been loaded");
            return;
        }

        const self = this;
        return new Promise(function(resolve)
        {
            if (!self.setBufferFromFiles(additionalFiles, resolve) &&
                !self.sefBufferFromUri(gltf, resolve))
            {
                console.error("Was not able to resolve buffer with uri '%s'", self.uri);
                resolve();
            }
        });
    }

    sefBufferFromUri(gltf, callback)
    {
        if (this.uri === undefined)
        {
            return false;
        }

        const self = this;
        axios.get(getContainingFolder(gltf.path) + this.uri, { responseType: 'arraybuffer'})
            .then(function(response)
            {
                self.buffer = response.data;
                callback();
            });
        return true;
    }

    setBufferFromFiles(files, callback)
    {
        if (this.uri === undefined || files === undefined)
        {
            return false;
        }

        const foundFile = files.find(function(file)
        {
            if (file.name === this.uri || file.fullPath === this.uri)
            {
                return true;
            }
        }, this);

        if (foundFile === undefined)
        {
            return false;
        }

        const self = this;
        const reader = new FileReader();
        reader.onloadend = function(event)
        {
            self.buffer = event.target.result;
            callback();
        };
        reader.readAsArrayBuffer(foundFile);

        return true;
    }
}

class gltfBufferView extends GltfObject
{
    constructor()
    {
        super();
        this.buffer = undefined;
        this.byteOffset = 0;
        this.byteLength = undefined;
        this.byteStride = 0;
        this.target = undefined;
        this.name = undefined;
    }
}

class gltfLight extends GltfObject
{
    constructor(
        type = "directional",
        color = [1, 1, 1],
        intensity = 1,
        innerConeAngle = 0,
        outerConeAngle = Math.PI / 4,
        range = -1,
        name = undefined,
        node = undefined)
    {
        super();
        this.type = type;
        this.color = color;
        this.intensity = intensity;
        this.innerConeAngle = innerConeAngle;
        this.outerConeAngle = outerConeAngle;
        this.range = range;
        this.name = name;
        // non gltf
        this.node = node;
    }

    initGl(gltf, webGlContext)
    {
        super.initGl(gltf, webGlContext);

        for (let i = 0; i < gltf.nodes.length; i++)
        {
            const nodeExtensions = gltf.nodes[i].extensions;
            if (nodeExtensions === undefined)
            {
                continue;
            }

            const lightsExtension = nodeExtensions.KHR_lights_punctual;
            if (lightsExtension === undefined)
            {
                continue;
            }

            const lightIndex = lightsExtension.light;
            if (gltf.lights[lightIndex] === this)
            {
                this.node = i;
                break;
            }
        }
    }

    fromJson(jsonLight)
    {
        super.fromJson(jsonLight);

        if(jsonLight.spot !== undefined)
        {
            fromKeys(this, jsonLight.spot);
        }
    }

    toUniform(gltf)
    {
        const uLight = new UniformLight();

        if (this.node !== undefined)
        {
            const matrix = gltf.nodes[this.node].worldTransform;

            var scale = vec3.fromValues(1, 1, 1);
            mat4.getScaling(scale, matrix);

            // To extract a correct rotation, the scaling component must be eliminated.
            const mn = mat4.create();
            for(const col of [0, 1, 2])
            {
                mn[col] = matrix[col] / scale[0];
                mn[col + 4] = matrix[col + 4] / scale[1];
                mn[col + 8] = matrix[col + 8] / scale[2];
            }
            var rotation = quat.create();
            mat4.getRotation(rotation, mn);
            quat.normalize(rotation, rotation);

            const alongNegativeZ = vec3.fromValues(0, 0, -1);
            vec3.transformQuat(uLight.direction, alongNegativeZ, rotation);

            var translation = vec3.fromValues(0, 0, 0);
            mat4.getTranslation(translation, matrix);
            uLight.position = translation;
        }

        uLight.range = this.range;
        uLight.color = jsToGl(this.color);
        uLight.intensity = this.intensity;

        uLight.innerConeCos = Math.cos(this.innerConeAngle);
        uLight.outerConeCos = Math.cos(this.outerConeAngle);

        switch(this.type)
        {
        case "spot":
            uLight.type = Type_Spot;
            break;
        case "point":
            uLight.type = Type_Point;
            break;
        case "directional":
        default:
            uLight.type = Type_Directional;
            break;
        }

        return uLight;
    }
}

const Type_Directional = 0;
const Type_Point = 1;
const Type_Spot = 2;

class UniformLight extends UniformStruct
{
    constructor()
    {
        super();

        const defaultDirection = vec3.fromValues(-0.7399, -0.6428, -0.1983);
        this.direction = defaultDirection;
        this.range = -1;

        this.color = jsToGl([1, 1, 1]);
        this.intensity = 1;

        this.position = jsToGl([0, 0, 0]);
        this.innerConeCos = 0.0;

        this.outerConeCos = Math.PI / 4;
        this.type = Type_Directional;
        this.padding1 = 0.0;
        this.padding2 = 0.0;
    }
}

// https://github.com/KhronosGroup/glTF/blob/khr_ktx2_ibl/extensions/2.0/Khronos/KHR_lights_image_based/schema/imageBasedLight.schema.json

class ImageBasedLight extends GltfObject
{
    constructor()
    {
        super();
        this.rotation = jsToGl([0, 0, 0, 1]);
        this.brightnessFactor = 1;
        this.brightnessOffset = 0;
        this.specularEnvironmentTexture = undefined;
        this.diffuseEnvironmentTexture = undefined;
        this.sheenEnvironmentTexture = undefined;

        // non-gltf
        this.levelCount = 1;
    }

    fromJson(jsonIBL)
    {
        super.fromJson(jsonIBL);

        if(jsonIBL.extensions !== undefined)
        {
            this.fromJsonExtensions(jsonIBL.extensions);
        }
    }

    fromJsonExtensions(extensions)
    {
        if (extensions.KHR_materials_sheen !== undefined)
        {
            this.sheenEnvironmentTexture = extensions.KHR_materials_sheen.sheenEnvironmentTexture;
        }
    }

    initGl(gltf, webGlContext)
    {
        if (this.diffuseEnvironmentTexture !== undefined)
        {
            const textureObject = gltf.textures[this.diffuseEnvironmentTexture];
            textureObject.type = GL.TEXTURE_CUBE_MAP;
        }
        if (this.specularEnvironmentTexture !== undefined)
        {
            const textureObject = gltf.textures[this.specularEnvironmentTexture];
            textureObject.type = GL.TEXTURE_CUBE_MAP;

            const imageObject = gltf.images[textureObject.source];
            this.levelCount = imageObject.image.levelCount;
        }
        if(this.sheenEnvironmentTexture !== undefined)
        {
            const textureObject = gltf.textures[this.sheenEnvironmentTexture];
            textureObject.type = GL.TEXTURE_CUBE_MAP;

            const imageObject = gltf.images[textureObject.source];
            if (this.levelCount !== imageObject.image.levelCount)
            {
                console.error("Specular and sheen do not have same level count");
            }
        }
    }
}

class gltfTexture extends GltfObject
{
    constructor(sampler = undefined, source = undefined, type = GL.TEXTURE_2D, texture = undefined)
    {
        super();
        this.sampler = sampler; // index to gltfSampler, default sampler ?
        this.source = source; // index to gltfImage

        // non gltf
        this.glTexture = texture;
        this.type = type;
        this.initialized = false;
        this.mipLevelCount = 0;
    }

    initGl(gltf, webGlContext)
    {
        if (this.sampler === undefined)
        {
            this.sampler = gltf.samplers.length - 1;
        }

        initGlForMembers(this, gltf, webGlContext);
    }

    fromJson(jsonTexture)
    {
        super.fromJson(jsonTexture);
        if (jsonTexture.extensions !== undefined &&
            jsonTexture.extensions.KHR_texture_basisu !== undefined &&
            jsonTexture.extensions.KHR_texture_basisu.source !== undefined)
        {
            this.source = jsonTexture.extensions.KHR_texture_basisu.source;
        }
    }

    destroy()
    {
        if (this.glTexture !== undefined)
        {
            // TODO: this breaks the dependency direction
            WebGl.context.deleteTexture(this.glTexture);
        }

        this.glTexture = undefined;
    }
}

class gltfTextureInfo
{
    constructor(index = undefined, texCoord = 0, linear = true, samplerName = "", generateMips = true) // linear by default
    {
        this.index = index; // reference to gltfTexture
        this.texCoord = texCoord; // which UV set to use
        this.linear = linear;
        this.samplerName = samplerName;
        this.strength = 1.0; // occlusion
        this.scale = 1.0; // normal
        this.generateMips = generateMips;

        this.extensions = undefined;
    }

    initGl(gltf, webGlContext)
    {
        initGlForMembers(this, gltf, webGlContext);
    }

    fromJson(jsonTextureInfo)
    {
        fromKeys(this, jsonTextureInfo);
    }
}

class gltfMaterial extends GltfObject
{
    constructor()
    {
        super();
        this.name = undefined;
        this.pbrMetallicRoughness = undefined;
        this.normalTexture = undefined;
        this.occlusionTexture = undefined;
        this.emissiveTexture = undefined;
        this.emissiveFactor = vec3.fromValues(0, 0, 0);
        this.alphaMode = "OPAQUE";
        this.alphaCutoff = 0.5;
        this.doubleSided = false;

        // non gltf properties
        this.type = "unlit";
        this.textures = [];
        this.properties = new Map();
        this.defines = [];
    }

    static createDefault()
    {
        const defaultMaterial = new gltfMaterial();
        defaultMaterial.type = "MR";
        defaultMaterial.name = "Default Material";
        defaultMaterial.defines.push("MATERIAL_METALLICROUGHNESS 1");
        const baseColorFactor = vec4.fromValues(1, 1, 1, 1);
        const metallicFactor = 1;
        const roughnessFactor = 1;
        defaultMaterial.properties.set("u_BaseColorFactor", baseColorFactor);
        defaultMaterial.properties.set("u_MetallicFactor", metallicFactor);
        defaultMaterial.properties.set("u_RoughnessFactor", roughnessFactor);

        return defaultMaterial;
    }

    getShaderIdentifier()
    {
        switch (this.type)
        {
        default:
        case "SG": // fall through till we sparate shaders
        case "MR": return "pbr.frag";
            //case "SG": return "specular-glossiness.frag" ;
        }
    }

    getDefines()
    {
        return this.defines;
    }

    getProperties()
    {
        return this.properties;
    }

    getTextures()
    {
        return this.textures;
    }

    parseTextureInfoExtensions(textureInfo, textureKey)
    {
        if(textureInfo.extensions === undefined)
        {
            return;
        }

        if(textureInfo.extensions.KHR_texture_transform !== undefined)
        {
            const uvTransform = textureInfo.extensions.KHR_texture_transform;

            // override uvset
            if(uvTransform.texCoord !== undefined)
            {
                textureInfo.texCoord = uvTransform.texCoord;
            }

            let rotation = mat3.create();
            let scale = mat3.create();
            let translation = mat3.create();

            if(uvTransform.rotation !== undefined)
            {
                const s =  Math.sin(uvTransform.rotation);
                const c =  Math.cos(uvTransform.rotation);

                rotation = jsToGl([
                    c, s, 0.0,
                    -s, c, 0.0,
                    0.0, 0.0, 1.0]);
            }

            if(uvTransform.scale !== undefined)
            {
                scale = jsToGl([uvTransform.scale[0], 0, 0, 0, uvTransform.scale[1], 0, 0, 0, 1]);
            }

            if(uvTransform.offset !== undefined)
            {
                translation = jsToGl([1, 0, uvTransform.offset[0], 0, 1, uvTransform.offset[1], 0, 0, 1]);
            }

            let uvMatrix = mat3.create();
            mat3.multiply(uvMatrix, rotation, scale);
            mat3.multiply(uvMatrix, uvMatrix, translation);

            this.defines.push("HAS_" + textureKey.toUpperCase() + "_UV_TRANSFORM 1");
            this.properties.set("u_" + textureKey + "UVTransform", uvMatrix);
        }
    }

    initGl(gltf, webGlContext)
    {
        if (this.normalTexture !== undefined)
        {
            this.normalTexture.samplerName = "u_NormalSampler";
            this.parseTextureInfoExtensions(this.normalTexture, "Normal");
            this.textures.push(this.normalTexture);
            this.defines.push("HAS_NORMAL_MAP 1");
            this.properties.set("u_NormalScale", this.normalTexture.scale);
            this.properties.set("u_NormalUVSet", this.normalTexture.texCoord);
        }

        if (this.occlusionTexture !== undefined)
        {
            this.occlusionTexture.samplerName = "u_OcclusionSampler";
            this.parseTextureInfoExtensions(this.occlusionTexture, "Occlusion");
            this.textures.push(this.occlusionTexture);
            this.defines.push("HAS_OCCLUSION_MAP 1");
            this.properties.set("u_OcclusionStrength", this.occlusionTexture.strength);
            this.properties.set("u_OcclusionUVSet", this.occlusionTexture.texCoord);
        }

        this.properties.set("u_EmissiveFactor", this.emissiveFactor);
        if (this.emissiveTexture !== undefined)
        {
            this.emissiveTexture.samplerName = "u_EmissiveSampler";
            this.parseTextureInfoExtensions(this.emissiveTexture, "Emissive");
            this.textures.push(this.emissiveTexture);
            this.defines.push("HAS_EMISSIVE_MAP 1");
            this.properties.set("u_EmissiveUVSet", this.emissiveTexture.texCoord);
        }

        if (this.baseColorTexture !== undefined)
        {
            this.baseColorTexture.samplerName = "u_BaseColorSampler";
            this.parseTextureInfoExtensions(this.baseColorTexture, "BaseColor");
            this.textures.push(this.baseColorTexture);
            this.defines.push("HAS_BASE_COLOR_MAP 1");
            this.properties.set("u_BaseColorUVSet", this.baseColorTexture.texCoord);
        }

        if (this.metallicRoughnessTexture !== undefined)
        {
            this.metallicRoughnessTexture.samplerName = "u_MetallicRoughnessSampler";
            this.parseTextureInfoExtensions(this.metallicRoughnessTexture, "MetallicRoughness");
            this.textures.push(this.metallicRoughnessTexture);
            this.defines.push("HAS_METALLIC_ROUGHNESS_MAP 1");
            this.properties.set("u_MetallicRoughnessUVSet", this.metallicRoughnessTexture.texCoord);
        }

        if (this.diffuseTexture !== undefined)
        {
            this.diffuseTexture.samplerName = "u_DiffuseSampler";
            this.parseTextureInfoExtensions(this.diffuseTexture, "Diffuse");
            this.textures.push(this.diffuseTexture);
            this.defines.push("HAS_DIFFUSE_MAP 1");
            this.properties.set("u_DiffuseUVSet", this.diffuseTexture.texCoord);
        }

        if (this.specularGlossinessTexture !== undefined)
        {
            this.specularGlossinessTexture.samplerName = "u_SpecularGlossinessSampler";
            this.parseTextureInfoExtensions(this.specularGlossinessTexture, "SpecularGlossiness");
            this.textures.push(this.specularGlossinessTexture);
            this.defines.push("HAS_SPECULAR_GLOSSINESS_MAP 1");
            this.properties.set("u_SpecularGlossinessUVSet", this.specularGlossinessTexture.texCoord);
        }

        if(this.alphaMode === 'MASK') // only set cutoff value for mask material
        {
            this.defines.push("ALPHAMODE_MASK 1");
            this.properties.set("u_AlphaCutoff", this.alphaCutoff);
        }
        else if (this.alphaMode === 'OPAQUE')
        {
            this.defines.push("ALPHAMODE_OPAQUE 1");
        }

        if (this.pbrMetallicRoughness !== undefined && this.type !== "SG")
        {
            this.defines.push("MATERIAL_METALLICROUGHNESS 1");

            let baseColorFactor = vec4.fromValues(1, 1, 1, 1);
            let metallicFactor = 1;
            let roughnessFactor = 1;

            if (this.pbrMetallicRoughness.baseColorFactor !== undefined)
            {
                baseColorFactor = jsToGl(this.pbrMetallicRoughness.baseColorFactor);
            }

            if (this.pbrMetallicRoughness.metallicFactor !== undefined)
            {
                metallicFactor = this.pbrMetallicRoughness.metallicFactor;
            }

            if (this.pbrMetallicRoughness.roughnessFactor !== undefined)
            {
                roughnessFactor = this.pbrMetallicRoughness.roughnessFactor;
            }

            this.properties.set("u_BaseColorFactor", baseColorFactor);
            this.properties.set("u_MetallicFactor", metallicFactor);
            this.properties.set("u_RoughnessFactor", roughnessFactor);
        }

        if (this.extensions !== undefined)
        {
            if (this.extensions.KHR_materials_unlit !== undefined)
            {
                this.defines.push("MATERIAL_UNLIT 1");
            }

            if (this.extensions.KHR_materials_pbrSpecularGlossiness !== undefined)
            {
                this.defines.push("MATERIAL_SPECULARGLOSSINESS 1");

                let diffuseFactor = vec4.fromValues(1, 1, 1, 1);
                let specularFactor = vec3.fromValues(1, 1, 1);
                let glossinessFactor = 1;

                if (this.extensions.KHR_materials_pbrSpecularGlossiness.diffuseFactor !== undefined)
                {
                    diffuseFactor = jsToGl(this.extensions.KHR_materials_pbrSpecularGlossiness.diffuseFactor);
                }

                if (this.extensions.KHR_materials_pbrSpecularGlossiness.specularFactor !== undefined)
                {
                    specularFactor = jsToGl(this.extensions.KHR_materials_pbrSpecularGlossiness.specularFactor);
                }

                if (this.extensions.KHR_materials_pbrSpecularGlossiness.glossinessFactor !== undefined)
                {
                    glossinessFactor = this.extensions.KHR_materials_pbrSpecularGlossiness.glossinessFactor;
                }

                this.properties.set("u_DiffuseFactor", diffuseFactor);
                this.properties.set("u_SpecularFactor", specularFactor);
                this.properties.set("u_GlossinessFactor", glossinessFactor);
            }

            // Clearcoat is part of the default metallic-roughness shader
            if(this.extensions.KHR_materials_clearcoat !== undefined)
            {
                let clearcoatFactor = 0.0;
                let clearcoatRoughnessFactor = 0.0;

                this.defines.push("MATERIAL_CLEARCOAT 1");

                if(this.extensions.KHR_materials_clearcoat.clearcoatFactor !== undefined)
                {
                    clearcoatFactor = this.extensions.KHR_materials_clearcoat.clearcoatFactor;
                }
                if(this.extensions.KHR_materials_clearcoat.clearcoatRoughnessFactor !== undefined)
                {
                    clearcoatRoughnessFactor = this.extensions.KHR_materials_clearcoat.clearcoatRoughnessFactor;
                }

                if (this.clearcoatTexture !== undefined)
                {
                    this.clearcoatTexture.samplerName = "u_ClearcoatSampler";
                    this.parseTextureInfoExtensions(this.clearcoatTexture, "Clearcoat");
                    this.textures.push(this.clearcoatTexture);
                    this.defines.push("HAS_CLEARCOAT_TEXTURE_MAP 1");
                    this.properties.set("u_ClearcoatUVSet", this.clearcoatTexture.texCoord);
                }
                if (this.clearcoatRoughnessTexture !== undefined)
                {
                    this.clearcoatRoughnessTexture.samplerName = "u_ClearcoatRoughnessSampler";
                    this.parseTextureInfoExtensions(this.clearcoatRoughnessTexture, "ClearcoatRoughness");
                    this.textures.push(this.clearcoatRoughnessTexture);
                    this.defines.push("HAS_CLEARCOAT_ROUGHNESS_MAP 1");
                    this.properties.set("u_ClearcoatRoughnessUVSet", this.clearcoatRoughnessTexture.texCoord);
                }
                if (this.clearcoatNormalTexture !== undefined)
                {
                    this.clearcoatNormalTexture.samplerName = "u_ClearcoatNormalSampler";
                    this.parseTextureInfoExtensions(this.clearcoatNormalTexture, "ClearcoatNormal");
                    this.textures.push(this.clearcoatNormalTexture);
                    this.defines.push("HAS_CLEARCOAT_NORMAL_MAP 1");
                    this.properties.set("u_ClearcoatNormalUVSet", this.clearcoatNormalTexture.texCoord);
                }
                this.properties.set("u_ClearcoatFactor", clearcoatFactor);
                this.properties.set("u_ClearcoatRoughnessFactor", clearcoatRoughnessFactor);
            }

            // Sheen material extension
            // https://github.com/sebavan/glTF/tree/KHR_materials_sheen/extensions/2.0/Khronos/KHR_materials_sheen
            if(this.extensions.KHR_materials_sheen !== undefined)
            {
                let sheenRoughnessFactor = 0.0;
                let sheenColorFactor =  vec3.fromValues(1.0, 1.0, 1.0);

                this.defines.push("MATERIAL_SHEEN 1");

                if(this.extensions.KHR_materials_sheen.sheenRoughnessFactor !== undefined)
                {
                    sheenRoughnessFactor = this.extensions.KHR_materials_sheen.sheenRoughnessFactor;
                }
                if(this.extensions.KHR_materials_sheen.sheenColorFactor !== undefined)
                {
                    sheenColorFactor = jsToGl(this.extensions.KHR_materials_sheen.sheenColorFactor);
                }
                if (this.sheenRoughnessTexture !== undefined)
                {
                    this.sheenRoughnessTexture.samplerName = "u_sheenRoughnessSampler";
                    this.parseTextureInfoExtensions(this.sheenRoughnessTexture, "SheenRoughness");
                    this.textures.push(this.sheenRoughnessTexture);
                    this.defines.push("HAS_SHEEN_ROUGHNESS_MAP 1");
                    this.properties.set("u_SheenRoughnessUVSet", this.sheenRoughnessTexture.texCoord);
                }
                if (this.sheenColorTexture !== undefined)
                {
                    this.sheenColorTexture.samplerName = "u_SheenColorSampler";
                    this.parseTextureInfoExtensions(this.sheenColorTexture, "SheenColor");
                    this.textures.push(this.sheenColorTexture);
                    this.defines.push("HAS_SHEEN_COLOR_MAP 1");
                    this.properties.set("u_SheenColorUVSet", this.sheenColorTexture.texCoord);
                }

                this.properties.set("u_SheenRoughnessFactor", sheenRoughnessFactor);
                this.properties.set("u_SheenColorFactor", sheenColorFactor);
            }

            // KHR Extension: Transmission
            if (this.extensions.KHR_materials_transmission !== undefined)
            {
                let transmissionFactor = 0.0;

                this.defines.push("MATERIAL_TRANSMISSION 1");

                if (transmissionFactor !== undefined)
                {
                    transmissionFactor = this.extensions.KHR_materials_transmission.transmissionFactor;
                }
                if (this.transmissionTexture !== undefined)
                {
                    this.transmissionTexture.samplerName = "u_TransmissionSampler";
                    this.parseTextureInfoExtensions(this.transmissionTexture, "Transmission");
                    this.textures.push(this.transmissionTexture);
                    this.defines.push("HAS_TRANSMISSION_MAP 1");
                    this.properties.set("u_TransmissionUVSet", this.transmissionTexture.texCoord);
                }

                this.properties.set("u_TransmissionFactor", transmissionFactor);
            }
        }

        initGlForMembers(this, gltf, webGlContext);
    }

    fromJson(jsonMaterial)
    {
        super.fromJson(jsonMaterial);

        if (jsonMaterial.emissiveFactor !== undefined)
        {
            this.emissiveFactor = jsToGl(jsonMaterial.emissiveFactor);
        }

        if (jsonMaterial.normalTexture !== undefined)
        {
            const normalTexture = new gltfTextureInfo();
            normalTexture.fromJson(jsonMaterial.normalTexture);
            this.normalTexture = normalTexture;
        }

        if (jsonMaterial.occlusionTexture !== undefined)
        {
            const occlusionTexture = new gltfTextureInfo();
            occlusionTexture.fromJson(jsonMaterial.occlusionTexture);
            this.occlusionTexture = occlusionTexture;
        }

        if (jsonMaterial.emissiveTexture !== undefined)
        {
            const emissiveTexture = new gltfTextureInfo(undefined, 0, false);
            emissiveTexture.fromJson(jsonMaterial.emissiveTexture);
            this.emissiveTexture = emissiveTexture;
        }

        if(jsonMaterial.extensions !== undefined)
        {
            this.fromJsonMaterialExtensions(jsonMaterial.extensions);
        }

        if (jsonMaterial.pbrMetallicRoughness !== undefined && this.type !== "SG")
        {
            this.type = "MR";
            this.fromJsonMetallicRoughness(jsonMaterial.pbrMetallicRoughness);
        }
    }

    fromJsonMaterialExtensions(jsonExtensions)
    {
        if (jsonExtensions.KHR_materials_pbrSpecularGlossiness !== undefined)
        {
            this.type = "SG";
            this.fromJsonSpecularGlossiness(jsonExtensions.KHR_materials_pbrSpecularGlossiness);
        }

        if(jsonExtensions.KHR_materials_unlit !== undefined)
        {
            this.type = "unlit";
        }

        if(jsonExtensions.KHR_materials_clearcoat !== undefined)
        {
            this.fromJsonClearcoat(jsonExtensions.KHR_materials_clearcoat);
        }

        if(jsonExtensions.KHR_materials_sheen !== undefined)
        {
            this.fromJsonSheen(jsonExtensions.KHR_materials_sheen);
        }

        if(jsonExtensions.KHR_materials_transmission !== undefined)
        {
            this.fromJsonTransmission(jsonExtensions.KHR_materials_transmission);
        }
    }

    fromJsonMetallicRoughness(jsonMetallicRoughness)
    {
        if (jsonMetallicRoughness.baseColorTexture !== undefined)
        {
            const baseColorTexture = new gltfTextureInfo(undefined, 0, false);
            baseColorTexture.fromJson(jsonMetallicRoughness.baseColorTexture);
            this.baseColorTexture = baseColorTexture;
        }

        if (jsonMetallicRoughness.metallicRoughnessTexture !== undefined)
        {
            const metallicRoughnessTexture = new gltfTextureInfo();
            metallicRoughnessTexture.fromJson(jsonMetallicRoughness.metallicRoughnessTexture);
            this.metallicRoughnessTexture = metallicRoughnessTexture;
        }
    }

    fromJsonSpecularGlossiness(jsonSpecularGlossiness)
    {
        if (jsonSpecularGlossiness.diffuseTexture !== undefined)
        {
            const diffuseTexture = new gltfTextureInfo(undefined, 0, false);
            diffuseTexture.fromJson(jsonSpecularGlossiness.diffuseTexture);
            this.diffuseTexture = diffuseTexture;
        }

        if (jsonSpecularGlossiness.specularGlossinessTexture !== undefined)
        {
            const specularGlossinessTexture = new gltfTextureInfo();
            specularGlossinessTexture.fromJson(jsonSpecularGlossiness.specularGlossinessTexture);
            this.specularGlossinessTexture = specularGlossinessTexture;
        }
    }

    fromJsonClearcoat(jsonClearcoat)
    {
        if(jsonClearcoat.clearcoatTexture !== undefined)
        {
            const clearcoatTexture = new gltfTextureInfo();
            clearcoatTexture.fromJson(jsonClearcoat.clearcoatTexture);
            this.clearcoatTexture = clearcoatTexture;
        }

        if(jsonClearcoat.clearcoatRoughnessTexture !== undefined)
        {
            const clearcoatRoughnessTexture =  new gltfTextureInfo();
            clearcoatRoughnessTexture.fromJson(jsonClearcoat.clearcoatRoughnessTexture);
            this.clearcoatRoughnessTexture = clearcoatRoughnessTexture;
        }

        if(jsonClearcoat.clearcoatNormalTexture !== undefined)
        {
            const clearcoatNormalTexture =  new gltfTextureInfo();
            clearcoatNormalTexture.fromJson(jsonClearcoat.clearcoatNormalTexture);
            this.clearcoatNormalTexture = clearcoatNormalTexture;
        }
    }

    fromJsonSheen(jsonSheen)
    {
        if(jsonSheen.sheenColorTexture !== undefined)
        {
            const sheenColorTexture = new gltfTextureInfo();
            sheenColorTexture.fromJson(jsonSheen.sheenColorTexture);
            this.sheenColorTexture = sheenColorTexture;
        }
        if(jsonSheen.sheenRoughnessTexture !== undefined)
        {
            const sheenRoughnessTexture = new gltfTextureInfo();
            sheenRoughnessTexture.fromJson(jsonSheen.sheenRoughnessTexture);
            this.sheenRoughnessTexture = sheenRoughnessTexture;
        }
    }

    fromJsonTransmission(jsonTransmission)
    {
        if(jsonTransmission.transmissionTexture !== undefined)
        {
            const transmissionTexture = new gltfTextureInfo();
            transmissionTexture.fromJson(jsonTransmission.transmissionTexture);
            this.transmissionTexture = transmissionTexture;
        }
    }
}

class DracoDecoder {

    constructor(dracoLib) {
        if (!DracoDecoder.instance && dracoLib === undefined)
        {
            if (DracoDecoderModule === undefined)
            {
                console.error('Failed to initalize DracoDecoder: draco library undefined');
                return undefined;
            }
            else
            {
                dracoLib = DracoDecoderModule;
            }
        }
        if (!DracoDecoder.instance)
        {
            DracoDecoder.instance = this;
            this.module = null;

            this.initializingPromise = new Promise(resolve => {
                let dracoDecoderType = {};
                dracoDecoderType['onModuleLoaded'] = dracoDecoderModule => {
                    this.module = dracoDecoderModule;
                    resolve();
                };
                dracoLib(dracoDecoderType);
            });
        }
        return DracoDecoder.instance;
    }

    async ready() {
        await this.initializingPromise;
        Object.freeze(DracoDecoder.instance);
    }

}

class gltfPrimitive extends GltfObject
{
    constructor()
    {
        super();
        this.attributes = [];
        this.targets = [];
        this.indices = undefined;
        this.material = undefined;
        this.mode = GL.TRIANGLES;

        // non gltf
        this.glAttributes = [];
        this.defines = [];
        this.skip = true;
        this.hasWeights = false;
        this.hasJoints = false;
        this.hasNormals = false;
        this.hasTangents = false;
        this.hasTexcoord = false;
        this.hasColor = false;

        // The primitive centroid is used for depth sorting.
        this.centroid = undefined;
    }

    initGl(gltf, webGlContext)
    {
        // Use the default glTF material.
        if (this.material === undefined)
        {
            this.material = gltf.materials.length - 1;
        }

        initGlForMembers(this, gltf, webGlContext);

        const maxAttributes = webGlContext.getParameter(GL.MAX_VERTEX_ATTRIBS);

        // https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes

        if (this.extensions !== undefined)
        {
            if (this.extensions.KHR_draco_mesh_compression !== undefined)
            {
                const dracoDecoder = new DracoDecoder();
                if (dracoDecoder !== undefined && Object.isFrozen(dracoDecoder))
                {
                    let dracoGeometry = this.decodeDracoBufferToIntermediate(
                        this.extensions.KHR_draco_mesh_compression, gltf);
                    this.copyDataFromDecodedGeometry(gltf, dracoGeometry, this.attributes);
                }
                else
                {
                    console.warn('Failed to load draco compressed mesh: DracoDecoder not initialized');
                }
            }
        }

        // VERTEX ATTRIBUTES
        for (const attribute of Object.keys(this.attributes))
        {
            if(this.glAttributes.length >= maxAttributes)
            {
                console.error("To many vertex attributes for this primitive, skipping " + attribute);
                break;
            }

            const idx = this.attributes[attribute];
            switch (attribute)
            {
            case "POSITION":
                this.skip = false;
                this.glAttributes.push({ attribute: attribute, name: "a_Position", accessor: idx });
                break;
            case "NORMAL":
                this.hasNormals = true;
                this.defines.push("HAS_NORMALS 1");
                this.glAttributes.push({ attribute: attribute, name: "a_Normal", accessor: idx });
                break;
            case "TANGENT":
                this.hasTangents = true;
                this.defines.push("HAS_TANGENTS 1");
                this.glAttributes.push({ attribute: attribute, name: "a_Tangent", accessor: idx });
                break;
            case "TEXCOORD_0":
                this.hasTexcoord = true;
                this.defines.push("HAS_UV_SET1 1");
                this.glAttributes.push({ attribute: attribute, name: "a_UV1", accessor: idx });
                break;
            case "TEXCOORD_1":
                this.hasTexcoord = true;
                this.defines.push("HAS_UV_SET2 1");
                this.glAttributes.push({ attribute: attribute, name: "a_UV2", accessor: idx });
                break;
            case "COLOR_0":
                this.hasColor = true;
                const accessor = gltf.accessors[idx];
                this.defines.push("HAS_VERTEX_COLOR_" + accessor.type + " 1");
                this.glAttributes.push({ attribute: attribute, name: "a_Color", accessor: idx });
                break;
            case "JOINTS_0":
                this.hasJoints = true;
                this.defines.push("HAS_JOINT_SET1 1");
                this.glAttributes.push({ attribute: attribute, name: "a_Joint1", accessor: idx });
                break;
            case "WEIGHTS_0":
                this.hasWeights = true;
                this.defines.push("HAS_WEIGHT_SET1 1");
                this.glAttributes.push({ attribute: attribute, name: "a_Weight1", accessor: idx });
                break;
            case "JOINTS_1":
                this.hasJoints = true;
                this.defines.push("HAS_JOINT_SET2 1");
                this.glAttributes.push({ attribute: attribute, name: "a_Joint2", accessor: idx });
                break;
            case "WEIGHTS_1":
                this.hasWeights = true;
                this.defines.push("HAS_WEIGHT_SET2 1");
                this.glAttributes.push({ attribute: attribute, name: "a_Weight2", accessor: idx });
                break;
            default:
                console.log("Unknown attribute: " + attribute);
            }
        }

        // MORPH TARGETS
        if (this.targets !== undefined)
        {
            let i = 0;
            for (const target of this.targets)
            {
                if(this.glAttributes.length + 3 > maxAttributes)
                {
                    console.error("To many vertex attributes for this primitive, skipping target " + i);
                    break;
                }

                for (const attribute of Object.keys(target))
                {
                    const idx = target[attribute];

                    switch (attribute)
                    {
                    case "POSITION":
                        this.defines.push("HAS_TARGET_POSITION" + i + " 1");
                        this.glAttributes.push({ attribute: attribute, name: "a_Target_Position" + i, accessor: idx });
                        break;
                    case "NORMAL":
                        this.defines.push("HAS_TARGET_NORMAL" + i + " 1");
                        this.glAttributes.push({ attribute: attribute, name: "a_Target_Normal" + i, accessor: idx });
                        break;
                    case "TANGENT":
                        this.defines.push("HAS_TARGET_TANGENT" + i + " 1");
                        this.glAttributes.push({ attribute: attribute, name: "a_Target_Tangent" + i, accessor: idx });
                        break;
                    }
                }

                ++i;
            }
        }
    }

    getShaderIdentifier()
    {
        return "primitive.vert";
    }

    getDefines()
    {
        return this.defines;
    }

    setCentroid(centroid)
    {
        this.centroid = centroid;
    }

    fromJson(jsonPrimitive)
    {
        super.fromJson(jsonPrimitive);

        if(jsonPrimitive.extensions !== undefined)
        {
            this.fromJsonPrimitiveExtensions(jsonPrimitive.extensions);
        }
    }

    fromJsonPrimitiveExtensions(jsonExtensions)
    {
        if(jsonExtensions.KHR_materials_variants !== undefined)
        {
            this.fromJsonVariants(jsonExtensions.KHR_materials_variants);
        }
    }

    fromJsonVariants(jsonVariants)
    {
        if(jsonVariants.mappings !== undefined)
        {
            this.mappings = jsonVariants.mappings;
        }
    }

    copyDataFromDecodedGeometry(gltf, dracoGeometry, primitiveAttributes)
    {
        // indices
        let indexBuffer = dracoGeometry.index.array;
        this.loadBufferIntoGltf(indexBuffer, gltf, this.indices, 34963,
            "index buffer view");

        // Position
        if(dracoGeometry.attributes.POSITION !== undefined)
        {
            let positionBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.POSITION.array,
                dracoGeometry.attributes.POSITION.componentType);
            this.loadBufferIntoGltf(positionBuffer, gltf, primitiveAttributes["POSITION"], 34962,
                "position buffer view");
        }

        // Normal
        if(dracoGeometry.attributes.NORMAL !== undefined)
        {
            let normalBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.NORMAL.array,
                dracoGeometry.attributes.NORMAL.componentType);
            this.loadBufferIntoGltf(normalBuffer, gltf, primitiveAttributes["NORMAL"], 34962,
                "normal buffer view");
        }

        // TEXCOORD_0
        if(dracoGeometry.attributes.TEXCOORD_0 !== undefined)
        {
            let uvBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.TEXCOORD_0.array,
                dracoGeometry.attributes.TEXCOORD_0.componentType);
            this.loadBufferIntoGltf(uvBuffer, gltf, primitiveAttributes["TEXCOORD_0"], 34962,
                "TEXCOORD_0 buffer view");
        }

        // TEXCOORD_1
        if(dracoGeometry.attributes.TEXCOORD_1 !== undefined)
        {
            let uvBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.TEXCOORD_1.array,
                dracoGeometry.attributes.TEXCOORD_1.componentType);
            this.loadBufferIntoGltf(uvBuffer, gltf, primitiveAttributes["TEXCOORD_1"], 34962,
                "TEXCOORD_1 buffer view");
        }

        // Tangent
        if(dracoGeometry.attributes.TANGENT !== undefined)
        {
            let tangentBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.TANGENT.array,
                dracoGeometry.attributes.TANGENT.componentType);
            this.loadBufferIntoGltf(tangentBuffer, gltf, primitiveAttributes["TANGENT"], 34962,
                "Tangent buffer view");
        }

        // Color
        if(dracoGeometry.attributes.COLOR_0 !== undefined)
        {
            let colorBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.COLOR_0.array,
                dracoGeometry.attributes.COLOR_0.componentType);
            this.loadBufferIntoGltf(colorBuffer, gltf, primitiveAttributes["COLOR_0"], 34962,
                "color buffer view");
        }

        // JOINTS_0
        if(dracoGeometry.attributes.JOINTS_0 !== undefined)
        {
            let jointsBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.JOINTS_0.array,
                dracoGeometry.attributes.JOINTS_0.componentType);
            this.loadBufferIntoGltf(jointsBuffer, gltf, primitiveAttributes["JOINTS_0"], 34963,
                "JOINTS_0 buffer view");
        }

        // WEIGHTS_0
        if(dracoGeometry.attributes.WEIGHTS_0 !== undefined)
        {
            let weightsBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.WEIGHTS_0.array,
                dracoGeometry.attributes.WEIGHTS_0.componentType);
            this.loadBufferIntoGltf(weightsBuffer, gltf, primitiveAttributes["WEIGHTS_0"], 34963,
                "WEIGHTS_0 buffer view");
        }

        // JOINTS_1
        if(dracoGeometry.attributes.JOINTS_1 !== undefined)
        {
            let jointsBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.JOINTS_1.array,
                dracoGeometry.attributes.JOINTS_1.componentType);
            this.loadBufferIntoGltf(jointsBuffer, gltf, primitiveAttributes["JOINTS_1"], 34963,
                "JOINTS_1 buffer view");
        }

        // WEIGHTS_1
        if(dracoGeometry.attributes.WEIGHTS_1 !== undefined)
        {
            let weightsBuffer = this.loadArrayIntoArrayBuffer(dracoGeometry.attributes.WEIGHTS_1.array,
                dracoGeometry.attributes.WEIGHTS_1.componentType);
            this.loadBufferIntoGltf(weightsBuffer, gltf, primitiveAttributes["WEIGHTS_1"], 34963,
                "WEIGHTS_1 buffer view");
        }
    }

    loadBufferIntoGltf(buffer, gltf, gltfAccessorIndex, gltfBufferViewTarget, gltfBufferViewName)
    {
        const gltfBufferObj = new gltfBuffer();
        gltfBufferObj.byteLength = buffer.byteLength;
        gltfBufferObj.buffer = buffer;
        gltf.buffers.push(gltfBufferObj);

        const gltfBufferViewObj = new gltfBufferView();
        gltfBufferViewObj.buffer = gltf.buffers.length - 1;
        gltfBufferViewObj.byteLength = buffer.byteLength;
        if(gltfBufferViewName !== undefined)
        {
            gltfBufferViewObj.name = gltfBufferViewName;
        }
        gltfBufferViewObj.target = gltfBufferViewTarget;
        gltf.bufferViews.push(gltfBufferViewObj);

        gltf.accessors[gltfAccessorIndex].byteOffset = 0;
        gltf.accessors[gltfAccessorIndex].bufferView = gltf.bufferViews.length - 1;
    }

    loadArrayIntoArrayBuffer(arrayData, componentType)
    {
        let arrayBuffer;
        switch (componentType)
        {
        case "Int8Array":
            arrayBuffer = new ArrayBuffer(arrayData.length);
            let int8Array = new Int8Array(arrayBuffer);
            int8Array.set(arrayData);
            break;
        case "Uint8Array":
            arrayBuffer = new ArrayBuffer(arrayData.length);
            let uint8Array = new Uint8Array(arrayBuffer);
            uint8Array.set(arrayData);
            break;
        case "Int16Array":
            arrayBuffer = new ArrayBuffer(arrayData.length * 2);
            let int16Array = new Int16Array(arrayBuffer);
            int16Array.set(arrayData);
            break;
        case "Uint16Array":
            arrayBuffer = new ArrayBuffer(arrayData.length * 2);
            let uint16Array = new Uint16Array(arrayBuffer);
            uint16Array.set(arrayData);
            break;
        case "Int32Array":
            arrayBuffer = new ArrayBuffer(arrayData.length * 4);
            let int32Array = new Int32Array(arrayBuffer);
            int32Array.set(arrayData);
            break;
        case "Uint32Array":
            arrayBuffer = new ArrayBuffer(arrayData.length * 4);
            let uint32Array = new Uint32Array(arrayBuffer);
            uint32Array.set(arrayData);
            break;
        default:
        case "Float32Array":
            arrayBuffer = new ArrayBuffer(arrayData.length * 4);
            let floatArray = new Float32Array(arrayBuffer);
            floatArray.set(arrayData);
            break;
        }


        return arrayBuffer;
    }

    decodeDracoBufferToIntermediate(dracoExtension, gltf)
    {
        let dracoBufferViewIDX = dracoExtension.bufferView;

        const origGltfDrBufViewObj = gltf.bufferViews[dracoBufferViewIDX];
        const origGltfDracoBuffer = gltf.buffers[origGltfDrBufViewObj.buffer];

        const totalBuffer = new Int8Array( origGltfDracoBuffer.buffer );
        const actualBuffer = totalBuffer.slice(origGltfDrBufViewObj.byteOffset,
            origGltfDrBufViewObj.byteOffset + origGltfDrBufViewObj.byteLength);

        // decode draco buffer to geometry intermediate
        let dracoDecoder = new DracoDecoder();
        let draco = dracoDecoder.module;
        let decoder = new draco.Decoder();
        let decoderBuffer = new draco.DecoderBuffer();
        decoderBuffer.Init(actualBuffer, origGltfDrBufViewObj.byteLength);
        let geometry = this.decodeGeometry( draco, decoder, decoderBuffer, dracoExtension.attributes, gltf );

        draco.destroy( decoderBuffer );

        return geometry;
    }

    getDracoArrayTypeFromComponentType(componentType)
    {
        switch (componentType)
        {
        case GL.BYTE:
            return "Int8Array";
        case GL.UNSIGNED_BYTE:
            return "Uint8Array";
        case GL.SHORT:
            return "Int16Array";
        case GL.UNSIGNED_SHORT:
            return "Uint16Array";
        case GL.INT:
            return "Int32Array";
        case GL.UNSIGNED_INT:
            return "Uint32Array";
        case GL.FLOAT:
            return "Float32Array";
        default:
            return "Float32Array";
        }
    }

    decodeGeometry(draco, decoder, decoderBuffer, gltfDracoAttributes, gltf) {
        let dracoGeometry;
        let decodingStatus;

        // decode mesh in draco decoder
        let geometryType = decoder.GetEncodedGeometryType( decoderBuffer );
        if ( geometryType === draco.TRIANGULAR_MESH ) {
            dracoGeometry = new draco.Mesh();
            decodingStatus = decoder.DecodeBufferToMesh( decoderBuffer, dracoGeometry );
        }
        else
        {
            throw new Error( 'DRACOLoader: Unexpected geometry type.' );
        }

        if ( ! decodingStatus.ok() || dracoGeometry.ptr === 0 ) {
            throw new Error( 'DRACOLoader: Decoding failed: ' + decodingStatus.error_msg() );
        }

        let geometry = { index: null, attributes: {} };
        let vertexCount = dracoGeometry.num_points();

        // Gather all vertex attributes.
        for(let dracoAttr in gltfDracoAttributes)
        {
            let componentType = GL.BYTE;
            let accessotVertexCount;
            // find gltf accessor for this draco attribute
            for (const [key, value] of Object.entries(this.attributes))
            {
                if(key === dracoAttr)
                {
                    componentType = gltf.accessors[value].componentType;
                    accessotVertexCount = gltf.accessors[value].count;
                    break;
                }
            }

            // check if vertex count matches
            if(vertexCount !== accessotVertexCount)
            {
                throw new Error(`DRACOLoader: Accessor vertex count ${accessotVertexCount} does not match draco decoder vertex count  ${vertexCount}`);
            }
            componentType = this.getDracoArrayTypeFromComponentType(componentType);

            let dracoAttribute = decoder.GetAttributeByUniqueId( dracoGeometry, gltfDracoAttributes[dracoAttr]);
            var tmpObj = this.decodeAttribute( draco, decoder,
                dracoGeometry, dracoAttr, dracoAttribute, componentType);
            geometry.attributes[tmpObj.name] = tmpObj;
        }

        // Add index buffer
        if ( geometryType === draco.TRIANGULAR_MESH ) {

            // Generate mesh faces.
            let numFaces = dracoGeometry.num_faces();
            let numIndices = numFaces * 3;
            let dataSize = numIndices * 4;
            let ptr = draco._malloc( dataSize );
            decoder.GetTrianglesUInt32Array( dracoGeometry, dataSize, ptr );
            let index = new Uint32Array( draco.HEAPU32.buffer, ptr, numIndices ).slice();
            draco._free( ptr );

            geometry.index = { array: index, itemSize: 1 };

        }

        draco.destroy( dracoGeometry );
        return geometry;
    }

    decodeAttribute( draco, decoder, dracoGeometry, attributeName, attribute, attributeType) {
        let numComponents = attribute.num_components();
        let numPoints = dracoGeometry.num_points();
        let numValues = numPoints * numComponents;

        let ptr;
        let array;

        let dataSize;
        switch ( attributeType ) {
        case "Float32Array":
            dataSize = numValues * 4;
            ptr = draco._malloc( dataSize );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_FLOAT32, dataSize, ptr );
            array = new Float32Array( draco.HEAPF32.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Int8Array":
            ptr = draco._malloc( numValues );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_INT8, numValues, ptr );
            array = new Int8Array( draco.HEAP8.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Int16Array":
            dataSize = numValues * 2;
            ptr = draco._malloc( dataSize );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_INT16, dataSize, ptr );
            array = new Int16Array( draco.HEAP16.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Int32Array":
            dataSize = numValues * 4;
            ptr = draco._malloc( dataSize );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_INT32, dataSize, ptr );
            array = new Int32Array( draco.HEAP32.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Uint8Array":
            ptr = draco._malloc( numValues );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_UINT8, numValues, ptr );
            array = new Uint8Array( draco.HEAPU8.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Uint16Array":
            dataSize = numValues * 2;
            ptr = draco._malloc( dataSize );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_UINT16, dataSize, ptr );
            array = new Uint16Array( draco.HEAPU16.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        case "Uint32Array":
            dataSize = numValues * 4;
            ptr = draco._malloc( dataSize );
            decoder.GetAttributeDataArrayForAllPoints( dracoGeometry, attribute, draco.DT_UINT32, dataSize, ptr );
            array = new Uint32Array( draco.HEAPU32.buffer, ptr, numValues ).slice();
            draco._free( ptr );
            break;

        default:
            throw new Error( 'DRACOLoader: Unexpected attribute type.' );
        }

        return {
            name: attributeName,
            array: array,
            itemSize: numComponents,
            componentType: attributeType
        };

    }
}

class gltfMesh extends GltfObject
{
    constructor()
    {
        super();
        this.primitives = [];
        this.name = undefined;
        this.weights = [];
    }

    fromJson(jsonMesh)
    {
        super.fromJson(jsonMesh);

        if (jsonMesh.name !== undefined)
        {
            this.name = jsonMesh.name;
        }

        this.primitives = objectsFromJsons(jsonMesh.primitives, gltfPrimitive);

        if(jsonMesh.weights !== undefined)
        {
            this.weights = jsonMesh.weights;
        }
    }
}

// contain:
// transform
// child indices (reference to scene array of nodes)

class gltfNode extends GltfObject
{
    constructor()
    {
        super();
        this.camera = undefined;
        this.children = [];
        this.matrix = undefined;
        this.rotation = jsToGl([0, 0, 0, 1]);
        this.scale = jsToGl([1, 1, 1]);
        this.translation = jsToGl([0, 0, 0]);
        this.name = undefined;
        this.mesh = undefined;
        this.skin = undefined;

        // non gltf
        this.worldTransform = mat4.create();
        this.inverseWorldTransform = mat4.create();
        this.normalMatrix = mat4.create();
        this.light = undefined;
        this.changed = true;
    }

    initGl()
    {
        if (this.matrix !== undefined)
        {
            this.applyMatrix(this.matrix);
        }
        else
        {
            if (this.scale !== undefined)
            {
                this.scale = jsToGl(this.scale);
            }

            if (this.rotation !== undefined)
            {
                this.rotation = jsToGl(this.rotation);
            }

            if (this.translation !== undefined)
            {
                this.translation = jsToGl(this.translation);
            }
        }
        this.changed = true;
    }

    applyMatrix(matrixData)
    {
        this.matrix = jsToGl(matrixData);

        mat4.getScaling(this.scale, this.matrix);

        // To extract a correct rotation, the scaling component must be eliminated.
        const mn = mat4.create();
        for(const col of [0, 1, 2])
        {
            mn[col] = this.matrix[col] / this.scale[0];
            mn[col + 4] = this.matrix[col + 4] / this.scale[1];
            mn[col + 8] = this.matrix[col + 8] / this.scale[2];
        }
        mat4.getRotation(this.rotation, mn);
        quat.normalize(this.rotation, this.rotation);

        mat4.getTranslation(this.translation, this.matrix);

        this.changed = true;
    }

    // vec3
    applyTranslation(translation)
    {
        this.translation = translation;
        this.changed = true;
    }

    // quat
    applyRotation(rotation)
    {
        this.rotation = rotation;
        this.changed = true;
    }

    // vec3
    applyScale(scale)
    {
        this.scale = scale;
        this.changed = true;
    }

    resetTransform()
    {
        this.rotation = jsToGl([0, 0, 0, 1]);
        this.scale = jsToGl([1, 1, 1]);
        this.translation = jsToGl([0, 0, 0]);
        this.changed = true;
    }

    getLocalTransform()
    {
        if(this.transform === undefined || this.changed)
        {
            this.transform = mat4.create();
            mat4.fromRotationTranslationScale(this.transform, this.rotation, this.translation, this.scale);
            this.changed = false;
        }

        return mat4.clone(this.transform);
    }
}

class gltfSampler extends GltfObject
{
    constructor(
        magFilter = GL.LINEAR,
        minFilter = GL.LINEAR_MIPMAP_LINEAR,
        wrapS = GL.REPEAT,
        wrapT = GL.REPEAT)
    {
        super();
        this.magFilter = magFilter;
        this.minFilter = minFilter;
        this.wrapS = wrapS;
        this.wrapT = wrapT;
        this.name = undefined;
    }

    static createDefault()
    {
        return new gltfSampler();
    }
}

class gltfScene extends GltfObject
{
    constructor(nodes = [], name = undefined)
    {
        super();
        this.nodes = nodes;
        this.name = name;

        // non gltf
        this.imageBasedLight = undefined;
    }

    initGl(gltf, webGlContext)
    {
        super.initGl(gltf, webGlContext);

        if (this.extensions !== undefined &&
            this.extensions.KHR_lights_image_based !== undefined)
        {
            const index = this.extensions.KHR_lights_image_based.imageBasedLight;
            this.imageBasedLight = gltf.imageBasedLights[index];
        }
    }

    applyTransformHierarchy(gltf, rootTransform = mat4.create())
    {
        function applyTransform(gltf, node, parentTransform)
        {
            mat4.multiply(node.worldTransform, parentTransform, node.getLocalTransform());
            mat4.invert(node.inverseWorldTransform, node.worldTransform);
            mat4.transpose(node.normalMatrix, node.inverseWorldTransform);

            for (const child of node.children)
            {
                applyTransform(gltf, gltf.nodes[child], node.worldTransform);
            }
        }

        for (const node of this.nodes)
        {
            applyTransform(gltf, gltf.nodes[node], rootTransform);
        }
    }

    gatherNodes(gltf)
    {
        const nodes = [];

        function gatherNode(nodeIndex)
        {
            const node = gltf.nodes[nodeIndex];
            nodes.push(node);

            // recurse into children
            for(const child of node.children)
            {
                gatherNode(child);
            }
        }

        for (const node of this.nodes)
        {
            gatherNode(node);
        }

        return nodes;
    }

    includesNode(gltf, nodeIndex)
    {
        let children = [...this.nodes];
        while(children.length > 0)
        {
            const childIndex = children.pop();

            if (childIndex === nodeIndex)
            {
                return true;
            }

            children = children.concat(gltf.nodes[childIndex].children);
        }

        return false;
    }
}

class gltfAsset extends GltfObject
{
    constructor()
    {
        super();
        this.copyright = undefined;
        this.generator = undefined;
        this.version = undefined;
        this.minVersion = undefined;
    }
}

class gltfAnimationChannel extends GltfObject
{
    constructor()
    {
        super();
        this.target = {node: undefined, path: undefined};
        this.sampler = undefined;
    }
}

const InterpolationPath =
{
    TRANSLATION: "translation",
    ROTATION: "rotation",
    SCALE: "scale",
    WEIGHTS: "weights"
};

class gltfAnimationSampler extends GltfObject
{
    constructor()
    {
        super();
        this.input = undefined;
        this.interpolation = undefined;
        this.output = undefined;
    }
}

const InterpolationModes =
{
    LINEAR: "LINEAR",
    STEP: "STEP",
    CUBICSPLINE: "CUBICSPLINE"
};

class gltfInterpolator
{
    constructor()
    {
        this.prevKey = 0;
        this.prevT = 0.0;
    }

    slerpQuat(q1, q2, t)
    {
        const qn1 = quat.create();
        const qn2 = quat.create();

        quat.normalize(qn1, q1);
        quat.normalize(qn2, q2);

        const quatResult = quat.create();

        quat.slerp(quatResult, qn1, qn2, t);
        quat.normalize(quatResult, quatResult);

        return quatResult;
    }

    step(prevKey, output, stride)
    {
        const result = new glMatrix.ARRAY_TYPE(stride);

        for(let i = 0; i < stride; ++i)
        {
            result[i] = output[prevKey * stride + i];
        }

        return result;
    }

    linear(prevKey, nextKey, output, t, stride)
    {
        const result = new glMatrix.ARRAY_TYPE(stride);

        for(let i = 0; i < stride; ++i)
        {
            result[i] = output[prevKey * stride + i] * (1-t) + output[nextKey * stride + i] * t;
        }

        return result;
    }

    cubicSpline(prevKey, nextKey, output, keyDelta, t, stride)
    {
        // stride: Count of components (4 in a quaternion).
        // Scale by 3, because each output entry consist of two tangents and one data-point.
        const prevIndex = prevKey * stride * 3;
        const nextIndex = nextKey * stride * 3;
        const A = 0;
        const V = 1 * stride;
        const B = 2 * stride;

        const result = new glMatrix.ARRAY_TYPE(stride);
        const tSq = t ** 2;
        const tCub = t ** 3;

        // We assume that the components in output are laid out like this: in-tangent, point, out-tangent.
        // https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#appendix-c-spline-interpolation
        for(let i = 0; i < stride; ++i)
        {
            const v0 = output[prevIndex + i + V];
            const a = keyDelta * output[nextIndex + i + A];
            const b = keyDelta * output[prevIndex + i + B];
            const v1 = output[nextIndex + i + V];

            result[i] = ((2*tCub - 3*tSq + 1) * v0) + ((tCub - 2*tSq + t) * b) + ((-2*tCub + 3*tSq) * v1) + ((tCub - tSq) * a);
        }

        return result;
    }

    resetKey()
    {
        this.prevKey = 0;
    }

    interpolate(gltf, channel, sampler, t, stride, maxTime)
    {
        const input = gltf.accessors[sampler.input].getDeinterlacedView(gltf);
        const output = gltf.accessors[sampler.output].getDeinterlacedView(gltf);

        if(output.length === stride) // no interpolation for single keyFrame animations
        {
            return jsToGlSlice(output, 0, stride);
        }

        // Wrap t around, so the animation loops.
        // Make sure that t is never earlier than the first keyframe and never later then the last keyframe.
        t = t % maxTime;
        t = clamp(t, input[0], input[input.length - 1]);

        if (this.prevT > t)
        {
            this.prevKey = 0;
        }

        this.prevT = t;

        // Find next keyframe: min{ t of input | t > prevKey }
        let nextKey = null;
        for (let i = this.prevKey; i < input.length; ++i)
        {
            if (t <= input[i])
            {
                nextKey = clamp(i, 1, input.length - 1);
                break;
            }
        }
        this.prevKey = clamp(nextKey - 1, 0, nextKey);

        const keyDelta = input[nextKey] - input[this.prevKey];

        // Normalize t: [t0, t1] -> [0, 1]
        const tn = (t - input[this.prevKey]) / keyDelta;

        if(channel.target.path === InterpolationPath.ROTATION)
        {

            if(InterpolationModes.CUBICSPLINE === sampler.interpolation)
            {
                // GLTF requires cubic spline interpolation for quaternions.
                // https://github.com/KhronosGroup/glTF/issues/1386
                const result = this.cubicSpline(this.prevKey, nextKey, output, keyDelta, tn, 4);
                quat.normalize(result, result);
                return result;
            }
            else if(sampler.interpolation === InterpolationModes.LINEAR)
            {
                const q0 = this.getQuat(output, this.prevKey);
                const q1 = this.getQuat(output, nextKey);
                return this.slerpQuat(q0, q1, tn);
            }
            else if(sampler.interpolation === InterpolationModes.STEP)
            {
                return this.getQuat(output, this.prevKey);
            }

        }

        switch(sampler.interpolation)
        {
        case InterpolationModes.STEP:
            return this.step(this.prevKey, output, stride);
        case InterpolationModes.CUBICSPLINE:
            return this.cubicSpline(this.prevKey, nextKey, output, keyDelta, tn, stride);
        default:
            return this.linear(this.prevKey, nextKey, output, tn, stride);
        }
    }

    getQuat(output, index)
    {
        const x = output[4 * index];
        const y = output[4 * index + 1];
        const z = output[4 * index + 2];
        const w = output[4 * index + 3];
        return quat.fromValues(x, y, z, w);
    }
}

class gltfAnimation extends GltfObject
{
    constructor()
    {
        super();
        this.channels = [];
        this.samplers = [];
        this.name = '';

        // not gltf
        this.interpolators = [];
        this.maxTime = 0;
    }

    fromJson(jsonAnimation)
    {
        super.fromJson(jsonAnimation);

        this.channels = objectsFromJsons(jsonAnimation.channels, gltfAnimationChannel);
        this.samplers = objectsFromJsons(jsonAnimation.samplers, gltfAnimationSampler);
        this.name = jsonAnimation.name;

        if(this.channels === undefined)
        {
            console.error("No channel data found for skin");
            return;
        }

        for(let i = 0; i < this.channels.length; ++i)
        {
            this.interpolators.push(new gltfInterpolator());
        }
    }

    advance(gltf, totalTime)
    {
        if(this.channels === undefined)
        {
            return;
        }

        if(this.maxTime == 0)
        {
            for(let i = 0; i < this.channels.length; ++i)
            {
                const channel = this.channels[i];
                const sampler = this.samplers[channel.sampler];
                const input = gltf.accessors[sampler.input].getDeinterlacedView(gltf);
                const max = input[input.length - 1];
                if(max > this.maxTime)
                {
                    this.maxTime = max;
                }
            }
        }

        for(let i = 0; i < this.interpolators.length; ++i)
        {
            const channel = this.channels[i];
            const sampler = this.samplers[channel.sampler];
            const interpolator = this.interpolators[i];

            const node = gltf.nodes[channel.target.node];

            switch(channel.target.path)
            {
            case InterpolationPath.TRANSLATION:
                node.applyTranslation(interpolator.interpolate(gltf, channel, sampler, totalTime, 3, this.maxTime));
                break;
            case InterpolationPath.ROTATION:
                node.applyRotation(interpolator.interpolate(gltf, channel, sampler, totalTime, 4, this.maxTime));
                break;
            case InterpolationPath.SCALE:
                node.applyScale(interpolator.interpolate(gltf, channel, sampler, totalTime, 3, this.maxTime));
                break;
            case InterpolationPath.WEIGHTS:
            {
                const mesh = gltf.meshes[node.mesh];
                mesh.weights = interpolator.interpolate(gltf, channel, sampler, totalTime, mesh.weights.length, this.maxTime);
                break;
            }
            }
        }
    }
}

class gltfSkin extends GltfObject
{
    constructor()
    {
        super();

        this.name = "";
        this.inverseBindMatrices = undefined;
        this.joints = [];
        this.skeleton = undefined;

        // not gltf
        this.jointMatrices = [];
        this.jointNormalMatrices = [];
    }

    computeJoints(gltf, parentNode)
    {
        const ibmAccessor = gltf.accessors[this.inverseBindMatrices].getDeinterlacedView(gltf);
        this.jointMatrices = [];
        this.jointNormalMatrices = [];

        let i = 0;
        for(const joint of this.joints)
        {
            const node = gltf.nodes[joint];

            let jointMatrix = mat4.create();
            let ibm = jsToGlSlice(ibmAccessor, i++ * 16, 16);
            mat4.mul(jointMatrix, node.worldTransform, ibm);
            mat4.mul(jointMatrix, parentNode.inverseWorldTransform, jointMatrix);
            this.jointMatrices.push(jointMatrix);

            let normalMatrix = mat4.create();
            mat4.invert(normalMatrix, jointMatrix);
            mat4.transpose(normalMatrix, normalMatrix);
            this.jointNormalMatrices.push(normalMatrix);
        }
    }
}

class gltfVariant extends GltfObject
{
    constructor()
    {
        super();
        this.name = undefined;
    }

    fromJson(jsonVariant)
    {
        if(jsonVariant.name !== undefined)
        {
            this.name = jsonVariant.name;
        }
    }
}

class glTF extends GltfObject
{
    constructor(file)
    {
        super();
        this.asset = undefined;
        this.accessors = [];
        this.nodes = [];
        this.scene = undefined; // the default scene to show.
        this.scenes = [];
        this.cameras = [];
        this.lights = [];
        this.imageBasedLights = [];
        this.textures = [];
        this.images = [];
        this.samplers = [];
        this.meshes = [];
        this.buffers = [];
        this.bufferViews = [];
        this.materials = [];
        this.animations = [];
        this.skins = [];
        this.path = file;
    }

    initGl(webGlContext)
    {
        initGlForMembers(this, this, webGlContext);
    }

    fromJson(json)
    {
        super.fromJson(json);

        this.asset = objectFromJson(json.asset, gltfAsset);
        this.cameras = objectsFromJsons(json.cameras, gltfCamera);
        this.accessors = objectsFromJsons(json.accessors, gltfAccessor);
        this.meshes = objectsFromJsons(json.meshes, gltfMesh);
        this.samplers = objectsFromJsons(json.samplers, gltfSampler);
        this.materials = objectsFromJsons(json.materials, gltfMaterial);
        this.buffers = objectsFromJsons(json.buffers, gltfBuffer);
        this.bufferViews = objectsFromJsons(json.bufferViews, gltfBufferView);
        this.scenes = objectsFromJsons(json.scenes, gltfScene);
        this.textures = objectsFromJsons(json.textures, gltfTexture);
        this.nodes = objectsFromJsons(json.nodes, gltfNode);
        this.lights = objectsFromJsons(getJsonLightsFromExtensions(json.extensions), gltfLight);
        this.imageBasedLights = objectsFromJsons(getJsonIBLsFromExtensions(json.extensions), ImageBasedLight);
        this.images = objectsFromJsons(json.images, gltfImage);
        this.animations = objectsFromJsons(json.animations, gltfAnimation);
        this.skins = objectsFromJsons(json.skins, gltfSkin);
        this.variants = objectsFromJsons(getJsonVariantsFromExtension(json.extensions), gltfVariant);
        this.variants = enforceVariantsUniqueness(this.variants);

        this.materials.push(gltfMaterial.createDefault());
        this.samplers.push(gltfSampler.createDefault());

        if (json.scenes !== undefined)
        {
            if (json.scene === undefined && json.scenes.length > 0)
            {
                this.scene = 0;
            }
            else
            {
                this.scene = json.scene;
            }
        }
    }
}

function getJsonLightsFromExtensions(extensions)
{
    if (extensions === undefined)
    {
        return [];
    }
    if (extensions.KHR_lights_punctual === undefined)
    {
        return [];
    }
    return extensions.KHR_lights_punctual.lights;
}

function getJsonIBLsFromExtensions(extensions)
{
    if (extensions === undefined)
    {
        return [];
    }
    if (extensions.KHR_lights_image_based === undefined)
    {
        return [];
    }
    return extensions.KHR_lights_image_based.imageBasedLights;
}

function getJsonVariantsFromExtension(extensions)
{
    if (extensions === undefined)
    {
        return [];
    }
    if (extensions.KHR_materials_variants === undefined)
    {
        return [];
    }
    return extensions.KHR_materials_variants.variants;
}

function enforceVariantsUniqueness(variants)
{
    for(let i=0;i<variants.length;i++)
    {
        const name = variants[i].name;
        for(let j=i+1;j<variants.length;j++)
        {
            if(variants[j].name == name)
            {
                variants[j].name += "0";  // Add random character to duplicates
            }
        }
    }


    return variants;
}

class GlbParser
{
    constructor(data)
    {
        this.data = data;
        this.glbHeaderInts = 3;
        this.glbChunkHeaderInts = 2;
        this.glbMagic = 0x46546C67;
        this.glbVersion = 2;
        this.jsonChunkType = 0x4E4F534A;
        this.binaryChunkType = 0x004E4942;
    }

    extractGlbData()
    {
        const glbInfo = this.getCheckedGlbInfo();
        if (glbInfo === undefined)
        {
            return undefined;
        }

        let json = undefined;
        let buffers = [];
        const chunkInfos = this.getAllChunkInfos();
        for (let chunkInfo of chunkInfos)
        {
            if (chunkInfo.type == this.jsonChunkType && !json)
            {
                json = this.getJsonFromChunk(chunkInfo);
            }
            else if (chunkInfo.type == this.binaryChunkType)
            {
                buffers.push(this.getBufferFromChunk(chunkInfo));
            }
        }

        return { json: json, buffers: buffers };
    }

    getCheckedGlbInfo()
    {
        const header = new Uint32Array(this.data, 0, this.glbHeaderInts);
        const magic = header[0];
        const version = header[1];
        const length = header[2];

        if (!this.checkEquality(magic, this.glbMagic, "glb magic") ||
            !this.checkEquality(version, this.glbVersion, "glb header version") ||
            !this.checkEquality(length, this.data.byteLength, "glb byte length"))
        {
            return undefined;
        }

        return { "magic": magic, "version": version, "length": length };
    }

    getAllChunkInfos()
    {
        let infos = [];
        let chunkStart = this.glbHeaderInts * 4;
        while (chunkStart < this.data.byteLength)
        {
            const chunkInfo = this.getChunkInfo(chunkStart);
            infos.push(chunkInfo);
            chunkStart += chunkInfo.length + this.glbChunkHeaderInts * 4;
        }
        return infos;
    }

    getChunkInfo(headerStart)
    {
        const header = new Uint32Array(this.data, headerStart, this.glbChunkHeaderInts);
        const chunkStart = headerStart + this.glbChunkHeaderInts * 4;
        const chunkLength = header[0];
        const chunkType = header[1];
        return { "start": chunkStart, "length": chunkLength, "type": chunkType };
    }

    getJsonFromChunk(chunkInfo)
    {
        const chunkLength = chunkInfo.length;
        const jsonStart = (this.glbHeaderInts + this.glbChunkHeaderInts) * 4;
        const jsonSlice = new Uint8Array(this.data, jsonStart, chunkLength);
        const stringBuffer = new TextDecoder("utf-8").decode(jsonSlice);
        return JSON.parse(stringBuffer);
    }

    getBufferFromChunk(chunkInfo)
    {
        return this.data.slice(chunkInfo.start, chunkInfo.start + chunkInfo.length);
    }

    checkEquality(actual, expected, name)
    {
        if (actual == expected)
        {
            return true;
        }

        console.error("Found invalid/unsupported " + name + ", expected: " + expected + ", but was: " + actual);
        return false;
    }
}

class gltfLoader
{
    static async load(gltf, webGlContext, appendix = undefined)
    {
        const buffers = gltfLoader.getBuffers(appendix);
        const additionalFiles = gltfLoader.getAdditionalFiles(appendix);

        const buffersPromise = gltfLoader.loadBuffers(gltf, buffers, additionalFiles);

        await buffersPromise; // images might be stored in the buffers
        const imagesPromise = gltfLoader.loadImages(gltf, additionalFiles);

        return await Promise.all([buffersPromise, imagesPromise])
            .then(() => gltf.initGl(webGlContext));
    }

    static unload(gltf)
    {
        for (let image of gltf.images)
        {
            image.image = undefined;
        }
        gltf.images = [];

        for (let texture of gltf.textures)
        {
            texture.destroy();
        }
        gltf.textures = [];

        for (let accessor of gltf.accessors)
        {
            accessor.destroy();
        }
        gltf.accessors = [];
    }

    static getBuffers(appendix)
    {
        return gltfLoader.getTypedAppendix(appendix, ArrayBuffer);
    }

    static getAdditionalFiles(appendix)
    {
        if(typeof(File) !== 'undefined')
        {
            return gltfLoader.getTypedAppendix(appendix, File);
        }
        else
        {
            return;
        }
    }

    static getTypedAppendix(appendix, Type)
    {
        if (appendix && appendix.length > 0)
        {
            if (appendix[0] instanceof Type)
            {
                return appendix;
            }
        }
    }

    static loadBuffers(gltf, buffers, additionalFiles)
    {
        const promises = [];
        if (buffers)
        {
            const count = Math.min(buffers.length, gltf.buffers.length);
            for (let i = 0; i < count; ++i)
            {
                gltf.buffers[i].buffer = buffers[i];
            }
        }
        else
        {
            for (const buffer of gltf.buffers)
            {
                promises.push(buffer.load(gltf, additionalFiles));
            }
        }
        return Promise.all(promises);
    }

    static loadImages(gltf, additionalFiles)
    {
        const imagePromises = [];
        for (let image of gltf.images)
        {
            imagePromises.push(image.load(gltf, additionalFiles));
        }
        return Promise.all(imagePromises);
    }
}

var iblFiltering = "precision mediump float;\n#define GLSLIFY 1\n#define MATH_PI 3.1415926535897932384626433832795\nuniform samplerCube uCubeMap;const int cLambertian=0;const int cGGX=1;const int cCharlie=2;uniform float u_roughness;uniform int u_sampleCount;uniform int u_width;uniform float u_lodBias;uniform int u_distribution;uniform int u_currentFace;in vec2 texCoord;out vec4 fragmentColor;vec3 uvToXYZ(int face,vec2 uv){if(face==0)return vec3(1.f,uv.y,-uv.x);else if(face==1)return vec3(-1.f,uv.y,uv.x);else if(face==2)return vec3(+uv.x,-1.f,+uv.y);else if(face==3)return vec3(+uv.x,1.f,-uv.y);else if(face==4)return vec3(+uv.x,uv.y,1.f);else{return vec3(-uv.x,+uv.y,-1.f);}}vec2 dirToUV(vec3 dir){return vec2(0.5f+0.5f*atan(dir.z,dir.x)/MATH_PI,1.f-acos(dir.y)/MATH_PI);}float saturate(float v){return clamp(v,0.0f,1.0f);}float bitfieldReverse(uint bits){bits=(bits<<16u)|(bits>>16u);bits=((bits&0x55555555u)<<1u)|((bits&0xAAAAAAAAu)>>1u);bits=((bits&0x33333333u)<<2u)|((bits&0xCCCCCCCCu)>>2u);bits=((bits&0x0F0F0F0Fu)<<4u)|((bits&0xF0F0F0F0u)>>4u);bits=((bits&0x00FF00FFu)<<8u)|((bits&0xFF00FF00u)>>8u);return float(bits);}float Hammersley(uint i){return bitfieldReverse(i)*2.3283064365386963e-10;}vec3 getImportanceSampleDirection(vec3 normal,float sinTheta,float cosTheta,float phi){vec3 H=normalize(vec3(sinTheta*cos(phi),sinTheta*sin(phi),cosTheta));vec3 bitangent=vec3(0.0,1.0,0.0);float NdotX=dot(normal,vec3(1.0,0.0,0.0));float NdotY=dot(normal,vec3(0.0,1.0,0.0));float NdotZ=dot(normal,vec3(0.0,0.0,1.0));if(abs(NdotY)>abs(NdotX)&&abs(NdotY)>abs(NdotZ)){if(NdotY>0.0){bitangent=vec3(0.0,0.0,1.0);}else{bitangent=vec3(0.0,0.0,-1.0);}}vec3 tangent=cross(bitangent,normal);bitangent=cross(normal,tangent);return normalize(tangent*H.x+bitangent*H.y+normal*H.z);}float V_Ashikhmin(float NdotL,float NdotV){return clamp(1.0/(4.0*(NdotL+NdotV-NdotL*NdotV)),0.0,1.0);}float D_GGX(float NdotH,float roughness){float alpha=roughness*roughness;float alpha2=alpha*alpha;float divisor=NdotH*NdotH*(alpha2-1.0)+1.0;return alpha2/(MATH_PI*divisor*divisor);}float D_Ashikhmin(float NdotH,float roughness){float alpha=roughness*roughness;float a2=alpha*alpha;float cos2h=NdotH*NdotH;float sin2h=1.0-cos2h;float sin4h=sin2h*sin2h;float cot2=-cos2h/(a2*sin2h);return 1.0/(MATH_PI*(4.0*a2+1.0)*sin4h)*(4.0*exp(cot2)+sin4h);}float D_Charlie(float sheenRoughness,float NdotH){sheenRoughness=max(sheenRoughness,0.000001);float alphaG=sheenRoughness*sheenRoughness;float invR=1.0/alphaG;float cos2h=NdotH*NdotH;float sin2h=1.0-cos2h;return(2.0+invR)*pow(sin2h,invR*0.5)/(2.0*MATH_PI);}vec3 getSampleVector(int sampleIndex,vec3 N,float roughness){float X=float(sampleIndex)/float(u_sampleCount);float Y=Hammersley(uint(sampleIndex));float phi=2.0*MATH_PI*X;float cosTheta=0.f;float sinTheta=0.f;if(u_distribution==cLambertian){cosTheta=1.0-Y;sinTheta=sqrt(1.0-cosTheta*cosTheta);}else if(u_distribution==cGGX){float alpha=roughness*roughness;cosTheta=sqrt((1.0-Y)/(1.0+(alpha*alpha-1.0)*Y));sinTheta=sqrt(1.0-cosTheta*cosTheta);}else if(u_distribution==cCharlie){float alpha=roughness*roughness;sinTheta=pow(Y,alpha/(2.0*alpha+1.0));cosTheta=sqrt(1.0-sinTheta*sinTheta);}return getImportanceSampleDirection(N,sinTheta,cosTheta,phi);}float PDF(vec3 V,vec3 H,vec3 N,vec3 L,float roughness){if(u_distribution==cLambertian){float NdotL=dot(N,L);return max(NdotL*(1.0/MATH_PI),0.0);}else if(u_distribution==cGGX){float VdotH=dot(V,H);float NdotH=dot(N,H);float D=D_GGX(NdotH,roughness);return max(D*NdotH/(4.0*VdotH),0.0);}else if(u_distribution==cCharlie){float VdotH=dot(V,H);float NdotH=dot(N,H);float D=D_Charlie(roughness,NdotH);return max(D*NdotH/abs(4.0*VdotH),0.0);}return 0.f;}vec3 filterColor(vec3 N){vec4 color=vec4(0.f);float solidAngleTexel=4.0*MATH_PI/(6.0*float(u_width)*float(u_width));for(int i=0;i<u_sampleCount;++i){vec3 H=getSampleVector(i,N,u_roughness);vec3 V=N;vec3 L=normalize(reflect(-V,H));float NdotL=dot(N,L);if(NdotL>0.0){float lod=0.0;if(u_roughness>0.0||u_distribution==cLambertian){float pdf=PDF(V,H,N,L,u_roughness);float solidAngleSample=1.0/(float(u_sampleCount)*pdf);lod=0.5*log2(solidAngleSample/solidAngleTexel);lod+=u_lodBias;}if(u_distribution==cLambertian){color+=vec4(textureLod(uCubeMap,H,lod).rgb,1.0);}else{color+=vec4(textureLod(uCubeMap,L,lod).rgb*NdotL,NdotL);}}}if(color.w==0.f){return color.rgb;}return color.rgb/color.w;}float V_SmithGGXCorrelated(float NoV,float NoL,float roughness){float a2=pow(roughness,4.0);float GGXV=NoL*sqrt(NoV*NoV*(1.0-a2)+a2);float GGXL=NoV*sqrt(NoL*NoL*(1.0-a2)+a2);return 0.5/(GGXV+GGXL);}vec3 LUT(float NdotV,float roughness){vec3 V=vec3(sqrt(1.0-NdotV*NdotV),0.0,NdotV);vec3 N=vec3(0.0,0.0,1.0);float A=0.0;float B=0.0;float C=0.0;for(int i=0;i<u_sampleCount;++i){vec3 H=getSampleVector(i,N,roughness);vec3 L=normalize(reflect(-V,H));float NdotL=saturate(L.z);float NdotH=saturate(H.z);float VdotH=saturate(dot(V,H));if(NdotL>0.0){if(u_distribution==cGGX){float V_pdf=V_SmithGGXCorrelated(NdotV,NdotL,roughness)*VdotH*NdotL/NdotH;float Fc=pow(1.0-VdotH,5.0);A+=(1.0-Fc)*V_pdf;B+=Fc*V_pdf;C+=0.0;}if(u_distribution==cCharlie){float sheenDistribution=D_Charlie(roughness,NdotH);float sheenVisibility=V_Ashikhmin(NdotL,NdotV);A+=0.0;B+=0.0;C+=sheenVisibility*sheenDistribution*NdotL*VdotH;}}}return vec3(4.0*A,4.0*B,4.0*2.0*MATH_PI*C)/float(u_sampleCount);}void main(){vec2 newUV=texCoord;newUV=newUV*2.0-1.0;vec3 scan=uvToXYZ(u_currentFace,newUV);vec3 direction=normalize(scan);direction.y=-direction.y;vec3 color=filterColor(direction);fragmentColor=vec4(color,1.0);}"; // eslint-disable-line

var panoramaToCubeMap = "#define MATH_PI 3.1415926535897932384626433832795\n#define MATH_INV_PI (1.0 / MATH_PI)\nprecision highp float;\n#define GLSLIFY 1\nin vec2 texCoord;out vec4 fragmentColor;uniform int u_currentFace;uniform sampler2D u_inputTexture;uniform sampler2D u_panorama;vec3 uvToXYZ(int face,vec2 uv){if(face==0)return vec3(1.f,uv.y,-uv.x);else if(face==1)return vec3(-1.f,uv.y,uv.x);else if(face==2)return vec3(+uv.x,-1.f,+uv.y);else if(face==3)return vec3(+uv.x,1.f,-uv.y);else if(face==4)return vec3(+uv.x,uv.y,1.f);else{return vec3(-uv.x,+uv.y,-1.f);}}vec2 dirToUV(vec3 dir){return vec2(0.5f+0.5f*atan(dir.z,dir.x)/MATH_PI,1.f-acos(dir.y)/MATH_PI);}vec3 panoramaToCubeMap(int face,vec2 texCoord){vec2 texCoordNew=texCoord*2.0-1.0;vec3 scan=uvToXYZ(face,texCoordNew);vec3 direction=normalize(scan);vec2 src=dirToUV(direction);return texture(u_panorama,src).rgb;}void main(void){fragmentColor=vec4(0.0,0.0,0.0,1.0);fragmentColor.rgb=panoramaToCubeMap(u_currentFace,texCoord);}"; // eslint-disable-line

var debugOutput = "precision highp float;\n#define GLSLIFY 1\nin vec2 texCoord;out vec4 fragmentColor;uniform int u_currentFace;uniform samplerCube u_inputTexture;vec3 uvToXYZ(int face,vec2 uv){if(face==0)return vec3(1.f,uv.y,-uv.x);else if(face==1)return vec3(-1.f,uv.y,uv.x);else if(face==2)return vec3(+uv.x,-1.f,+uv.y);else if(face==3)return vec3(+uv.x,1.f,-uv.y);else if(face==4)return vec3(+uv.x,uv.y,1.f);else{return vec3(-uv.x,+uv.y,-1.f);}}void main(void){fragmentColor=vec4(texCoord.x*10.0,0.0,texCoord.y*10.0,1.0);vec2 newUV=texCoord;newUV=newUV*2.0-1.0;vec4 textureColor=vec4(0.0,0.0,0.0,1.0);vec3 direction=normalize(uvToXYZ(u_currentFace,newUV.xy));textureColor=textureLod(u_inputTexture,direction,1.0);if(texCoord.x>0.1){fragmentColor=textureColor;}if(texCoord.y>0.1){fragmentColor=textureColor;}}"; // eslint-disable-line

var fullscreenShader = "precision highp float;\n#define GLSLIFY 1\nout vec2 texCoord;void main(void){float x=float((gl_VertexID&1)<<2);float y=float((gl_VertexID&2)<<1);texCoord.x=x*0.5;texCoord.y=y*0.5;gl_Position=vec4(x-1.0,y-1.0,0,1);}"; // eslint-disable-line

// How to use:
// set canvas/context in constructor
// init(input: panorama image)
// filterAll()
// fetch texture IDs

class iblSampler
{
    constructor(view)
    {

        this.gl = view.context;

        this.textureSize = 256;
        this.sampleCount = 64;
        this.lodBias = 0.0;
        this.mipmapCount = undefined;


        this.lambertianTextureID = undefined;
        this.ggxTextureID = undefined;
        this.sheenTextureID = undefined;


        this.inputTextureID = undefined;
        this.cubemapTextureID = undefined;
        this.framebuffer = undefined;

        const shaderSources = new Map();

        shaderSources.set("fullscreen.vert", fullscreenShader);
        shaderSources.set("panorama_to_cubemap.frag", panoramaToCubeMap);
        shaderSources.set("ibl_filtering.frag", iblFiltering);
        shaderSources.set("debug.frag", debugOutput);

        this.shaderCache = new ShaderCache(shaderSources, view.renderer.webGl);


    }

    /////////////////////////////////////////////////////////////////////


    loadTextureHDR(image)
    {

        var texture = this.gl.createTexture();

        this.gl.bindTexture( this.gl.TEXTURE_2D,  texture);

        var internalFormat = this.gl.RGB32F;
        var format = this.gl.RGB;
        var type = this.gl.FLOAT;
        var data = undefined;

        if (image.dataFloat instanceof Float32Array && typeof(this.gl.RGB32F) !== 'undefined')
        {
            internalFormat = this.gl.RGB32F;
            format = this.gl.RGB;
            type = this.gl.FLOAT;
            data = image.dataFloat;
        }
        else if(image.dataFloat instanceof Float32Array)
        {
            // workaround for node-gles not supporting RGB32F
            internalFormat = this.gl.RGBA32F;
            format = this.gl.RGBA;
            type = this.gl.FLOAT;

            const numPixels = image.dataFloat.length / 3;
            data = new Float32Array(numPixels * 4);
            for(let i = 0; i < numPixels; ++i)
            {
                // copy the pixels and padd the alpha channel
                data[i] = image.dataFloat[i];
                data[i+1] = image.dataFloat[i+1];
                data[i+2] = image.dataFloat[i+2];
                data[i+3] = 0;
            }
        }
        else if (typeof(Image) !== 'undefined' && image instanceof Image)
        {
            internalFormat = this.gl.RGBA;
            format = this.gl.RGBA;
            type = this.gl.UNSIGNED_BYTE;
            data = image;
        }
        else
        {
            console.error("loadTextureHDR failed, unsupported HDR image");
            return;
        }


        this.gl.texImage2D(
            this.gl.TEXTURE_2D,
            0, //level
            internalFormat,
            image.width,
            image.height,
            0, //border
            format,
            type,
            data);

        this.gl.texParameteri( this.gl.TEXTURE_2D,  this.gl.TEXTURE_WRAP_S,  this.gl.MIRRORED_REPEAT);
        this.gl.texParameteri( this.gl.TEXTURE_2D,  this.gl.TEXTURE_WRAP_T,  this.gl.MIRRORED_REPEAT);
        this.gl.texParameteri( this.gl.TEXTURE_2D,  this.gl.TEXTURE_MIN_FILTER,  this.gl.LINEAR);
        this.gl.texParameteri( this.gl.TEXTURE_2D,  this.gl.TEXTURE_MAG_FILTER,  this.gl.LINEAR);

        return texture;
    }



    createCubemapTexture(withMipmaps)
    {
        var targetTexture =  this.gl.createTexture();
        this.gl.bindTexture( this.gl.TEXTURE_CUBE_MAP, targetTexture);


        // define size and format of level 0
        const level = 0;
        const internalFormat = this.use8bit ? this.gl.RGBA8 : this.gl.RGBA32F;
        const border = 0;
        const format = this.gl.RGBA;
        const type = this.use8bit ? this.gl.UNSIGNED_BYTE : this.gl.FLOAT;
        const data = null;

        for(var i = 0; i < 6; ++i)
        {
            this.gl.texImage2D(this.gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, level, internalFormat,
                this.textureSize, this.textureSize, border,
                format, type, data);

        }

        if(withMipmaps)
        {
            this.gl.texParameteri( this.gl.TEXTURE_CUBE_MAP,  this.gl.TEXTURE_MIN_FILTER,  this.gl.LINEAR_MIPMAP_LINEAR);
        }
        else
        {
            this.gl.texParameteri( this.gl.TEXTURE_CUBE_MAP,  this.gl.TEXTURE_MIN_FILTER,  this.gl.LINEAR);
        }

        this.gl.texParameteri( this.gl.TEXTURE_CUBE_MAP,  this.gl.TEXTURE_MAG_FILTER,  this.gl.LINEAR);
        this.gl.texParameteri( this.gl.TEXTURE_CUBE_MAP,  this.gl.TEXTURE_WRAP_S,  this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri( this.gl.TEXTURE_CUBE_MAP,  this.gl.TEXTURE_WRAP_T,  this.gl.CLAMP_TO_EDGE);

        return targetTexture;
    }

    init(panoramaImage)
    {
        if (!this.gl.getExtension('EXT_color_buffer_float'))
        {
            this.use8bit = true;
        }

        this.inputTextureID = this.loadTextureHDR(panoramaImage);

        this.cubemapTextureID = this.createCubemapTexture(true);

        this.framebuffer = this.gl.createFramebuffer();

        this.lambertianTextureID = this.createCubemapTexture(false);
        this.ggxTextureID = this.createCubemapTexture(true);
        this.sheenTextureID = this.createCubemapTexture(true);


        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.ggxTextureID);
        this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);

        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.sheenTextureID);
        this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);

        this.mipmapLevels = Math.floor(Math.log2(this.textureSize))+1;
    }

    filterAll()
    {
        this.panoramaToCubeMap();
        this.cubeMapToLambertian();
        this.cubeMapToGGX();
        this.cubeMapToSheen();

        this.gl.bindFramebuffer(  this.gl.FRAMEBUFFER, null);
    }




    panoramaToCubeMap()
    {
        for(var i = 0; i < 6; ++i)
        {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
            var side = i;
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_CUBE_MAP_POSITIVE_X+side, this.cubemapTextureID, 0);

            this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemapTextureID);

            this.gl.viewport(0, 0,  this.textureSize,  this.textureSize);

            this.gl.clearColor(1.0, 0.0, 0.0, 0.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT| this.gl.DEPTH_BUFFER_BIT);

            const vertexHash = this.shaderCache.selectShader("fullscreen.vert", []);
            const fragmentHash = this.shaderCache.selectShader("panorama_to_cubemap.frag", []);

            var shader = this.shaderCache.getShaderProgram(fragmentHash, vertexHash);
            this.gl.useProgram(shader.program);

            //  TEXTURE0 = active.
            this.gl.activeTexture(this.gl.TEXTURE0+0);

            // Bind texture ID to active texture
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.inputTextureID);

            // map shader uniform to texture unit (TEXTURE0)
            const location = this.gl.getUniformLocation(shader.program,"u_panorama");
            this.gl.uniform1i(location, this.gl.TEXTURE0+0); // texture unit 0 (TEXTURE0)

            shader.updateUniform("u_currentFace", i);

            //fullscreen triangle
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
        }

        this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemapTextureID);
        this.gl.generateMipmap(this.gl.TEXTURE_CUBE_MAP);

    }


    applyFilter(
        distribution,
        roughness,
        targetMipLevel,
        targetTexture)
    {
        var currentTextureSize =  this.textureSize>>(targetMipLevel);

        for(var i = 0; i < 6; ++i)
        {

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.framebuffer);
            var side = i;
            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_CUBE_MAP_POSITIVE_X+side, targetTexture, targetMipLevel);

            this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, targetTexture);

            this.gl.viewport(0, 0, currentTextureSize, currentTextureSize);

            this.gl.clearColor(1.0, 0.0, 0.0, 0.0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT| this.gl.DEPTH_BUFFER_BIT);


            const vertexHash = this.shaderCache.selectShader("fullscreen.vert", []);
            const fragmentHash = this.shaderCache.selectShader("ibl_filtering.frag", []);

            var shader = this.shaderCache.getShaderProgram(fragmentHash, vertexHash);
            this.gl.useProgram(shader.program);


            //  TEXTURE0 = active.
            this.gl.activeTexture(this.gl.TEXTURE0+0);

            // Bind texture ID to active texture
            this.gl.bindTexture(this.gl.TEXTURE_CUBE_MAP, this.cubemapTextureID);

            // map shader uniform to texture unit (TEXTURE0)
            const location = this.gl.getUniformLocation(shader.program,"u_cubemapTexture");
            this.gl.uniform1i(location, 0); // texture unit 0


            shader.updateUniform("u_roughness", roughness);
            shader.updateUniform("u_sampleCount", this.sampleCount);
            shader.updateUniform("u_width", this.textureSize);
            shader.updateUniform("u_lodBias", this.lodBias);
            shader.updateUniform("u_distribution", distribution);
            shader.updateUniform("u_currentFace", i);


            //fullscreen triangle
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);

        }

    }

    cubeMapToLambertian()
    {
        this.applyFilter(
            0,
            0.0,
            0,
            this.lambertianTextureID);
    }


    cubeMapToGGX()
    {
        for(var currentMipLevel = 0; currentMipLevel < this.mipmapLevels; ++currentMipLevel)
        {
            const roughness =  (currentMipLevel) /  (this.mipmapLevels - 1);
            this.applyFilter(
                1,
                roughness,
                currentMipLevel,
                this.ggxTextureID);
        }
    }

    cubeMapToSheen()
    {
        for(var currentMipLevel = 0; currentMipLevel < this.mipmapLevels; ++currentMipLevel)
        {
            const roughness =  (currentMipLevel) /  (this.mipmapLevels - 1);
            this.applyFilter(
                2,
                roughness,
                currentMipLevel,
                this.sheenTextureID);
        }
    }


    destroy()
    {
        this.shaderCache.destroy();
    }
}

class KtxDecoder {

    constructor (context, externalKtxlib) {
        this.gl = context;
        this.libktx = null;
        if (context !== undefined)
        {
            if (externalKtxlib === undefined && LIBKTX !== undefined)
            {
                externalKtxlib = LIBKTX;
            }
            if (externalKtxlib !== undefined)
            {
                this.initializied = this.init(context, externalKtxlib);
            }
            else
            {
                console.error('Failed to initalize KTXDecoder: ktx library undefined');
                return undefined;
            }
        }
        else
        {
            console.error('Failed to initalize KTXDecoder: WebGL context undefined');
            return undefined;
        }
    }

    async init(context, externalKtxlib) {
        this.libktx = await externalKtxlib({preinitializedWebGLContext: context});
        this.libktx.GL.makeContextCurrent(this.libktx.GL.createContext(null, { majorVersion: 2.0 }));
    }

    transcode(ktexture) {
        if (ktexture.needsTranscoding) {
            let format;

            let astcSupported = false;
            let etcSupported = false;
            let dxtSupported = false;
            let pvrtcSupported = false;

            astcSupported = !!this.gl.getExtension('WEBGL_compressed_texture_astc');
            etcSupported = !!this.gl.getExtension('WEBGL_compressed_texture_etc1');
            dxtSupported = !!this.gl.getExtension('WEBGL_compressed_texture_s3tc');
            pvrtcSupported = !!(this.gl.getExtension('WEBGL_compressed_texture_pvrtc')) || !!(this.gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc'));

            if (astcSupported) {
                format = this.libktx.TranscodeTarget.ASTC_4x4_RGBA;
            } else if (dxtSupported) {
                format = this.libktx.TranscodeTarget.BC1_OR_3;
            } else if (pvrtcSupported) {
                format = this.libktx.TranscodeTarget.PVRTC1_4_RGBA;
            } else if (etcSupported) {
                format = this.libktx.TranscodeTarget.ETC;
            } else {
                format = this.libktx.TranscodeTarget.RGBA8888;
            }
            if (ktexture.transcodeBasis(format, 0) != this.libktx.ErrorCode.SUCCESS) {
                console.warn('Texture transcode failed. See console for details.');
            }
        }
    }

    async loadKtxFromUri(uri) {
        await this.initializied;
        const response = await fetch(uri);
        const data = new Uint8Array(await response.arrayBuffer());
        const texture = new this.libktx.ktxTexture(data);
        this.transcode(texture);
        let uploadResult = texture.glUpload();
        uploadResult.texture.levels = Math.log2(texture.baseWidth);
        return uploadResult.texture;
    }

    async loadKtxFromBuffer(data) {
        await this.initializied;
        const texture = new this.libktx.ktxTexture(data);
        this.transcode(texture);
        const uploadResult = texture.glUpload();
        return uploadResult.texture;
    }
}

/**
 * hdrpng.js - Original code from Enki https://enkimute.github.io/hdrpng.js/
 *
 * Refactored and simplified.
 */

function _rgbeToFloat(buffer)
{
    const length = buffer.byteLength >> 2;
    const result = new Float32Array(length * 3);

    for (let i = 0; i < length; i++)
    {
        const s = Math.pow(2, buffer[i * 4 + 3] - (128 + 8));

        result[i * 3] = buffer[i * 4] * s;
        result[i * 3 + 1] = buffer[i * 4 + 1] * s;
        result[i * 3 + 2] = buffer[i * 4 + 2] * s;
    }
    return result;
}

async function loadHDR(buffer)
{
    let header = '';
    let pos = 0;
    const d8 = buffer;
    let format = undefined;
    // read header.
    while (!header.match(/\n\n[^\n]+\n/g)) header += String.fromCharCode(d8[pos++]);
    // check format.
    format = header.match(/FORMAT=(.*)$/m)[1];
    if (format != '32-bit_rle_rgbe') return console.warn('unknown format : ' + format), this.onerror();
    // parse resolution
    const rez = header.split(/\n/).reverse()[1].split(' '), width = rez[3] * 1, height = rez[1] * 1;
    // Create image.
    const img = new Uint8Array(width * height * 4);
    let ipos = 0;
    // Read all scanlines
    for (let j = 0; j < height; j++)
    {
        const scanline = [];

        const rgbe = d8.slice(pos, pos += 4);
        const isNewRLE = (rgbe[0] == 2 && rgbe[1] == 2 && rgbe[2] == ((width >> 8) & 0xFF) && rgbe[3] == (width & 0xFF));

        if (isNewRLE && (width >= 8) && (width < 32768))
        {
            for (let i = 0; i < 4; i++)
            {
                let ptr = i * width;
                const ptr_end = (i + 1) * width;
                let buf = undefined;
                let count = undefined;
                while (ptr < ptr_end)
                {
                    buf = d8.slice(pos, pos += 2);
                    if (buf[0] > 128)
                    {
                        count = buf[0] - 128;
                        while (count-- > 0) scanline[ptr++] = buf[1];
                    }
                    else
                    {
                        count = buf[0] - 1;
                        scanline[ptr++] = buf[1];
                        while (count-- > 0) scanline[ptr++] = d8[pos++];
                    }
                }
            }

            for (let i = 0; i < width; i++)
            {
                img[ipos++] = scanline[i + 0 * width];
                img[ipos++] = scanline[i + 1 * width];
                img[ipos++] = scanline[i + 2 * width];
                img[ipos++] = scanline[i + 3 * width];
            }
        }
        else
        {
            pos -= 4;

            for (const i = 0; i < width; i++)
            {
                rgbe = d8.slice(pos, pos += 4);

                img[ipos++] = rgbe[0];
                img[ipos++] = rgbe[1];
                img[ipos++] = rgbe[2];
                img[ipos++] = rgbe[3];
            }
        }
    }

    const imageFloatBuffer = _rgbeToFloat(img);

    return {
        dataFloat: imageFloatBuffer,
        width: width,
        height: height
    };
}

function initKtxLib(view, ktxlib)
{
    view.ktxDecoder = new KtxDecoder(view.context, ktxlib);
}

async function initDracoLib(dracolib)
{
    const dracoDecoder = new DracoDecoder(dracolib);
    if (dracoDecoder !== undefined)
    {
        await dracoDecoder.ready();
    }
}

async function loadGltf(file, view, additionalFiles)
{
    let isGlb = undefined;
    let buffers = undefined;
    let json = undefined;
    let data = undefined;
    let filename = "";
    if (typeof file === "string")
    {
        isGlb = getIsGlb(file);
        let response = await axios.get(file, { responseType: isGlb ? "arraybuffer" : "json" });
        json = response.data;
        data = response.data;
        filename = file;
    }
    else if (file instanceof ArrayBuffer)
    {
        isGlb = additionalFiles === undefined;
        if (isGlb)
        {
            data = file;
        }
    }
    else if (typeof (File) !== 'undefined' && file instanceof File)
    {
        let fileContent = file;
        filename = file.name;
        isGlb = getIsGlb(filename);
        if (isGlb)
        {
            data = await AsyncFileReader.readAsArrayBuffer(fileContent);
        }
        else
        {
            data = await AsyncFileReader.readAsText(fileContent);
            json = JSON.parse(data);
            buffers = additionalFiles;
        }
    }
    else
    {
        console.error("Passed invalid type to loadGltf " + typeof (file));
    }

    if (isGlb)
    {
        const glbParser = new GlbParser(data);
        const glb = glbParser.extractGlbData();
        json = glb.json;
        buffers = glb.buffers;
    }

    const gltf = new glTF(filename);
    gltf.ktxDecoder = view.ktxDecoder;
    //Make sure draco decoder instance is ready
    gltf.fromJson(json);

    // because the gltf image paths are not relative
    // to the gltf, we have to resolve all image paths before that
    for (const image of gltf.images)
    {
        image.resolveRelativePath(getContainingFolder(gltf.path));
    }

    await gltfLoader.load(gltf, view.context, buffers);

    return gltf;
}


async function loadEnvironment(file, view, luts)
{
    let image = undefined;
    if (typeof file === "string")
    {
        let response = await axios.get(file, { responseType: "arraybuffer" });

        image = await loadHDR(new Uint8Array(response.data));
    }
    else if (file instanceof ArrayBuffer)
    {
        image = await loadHDR(new Uint8Array(file));
    }
    else
    {
        const imageData = await AsyncFileReader.readAsArrayBuffer(file).catch(() =>
        {
            console.error("Could not load image with FileReader");
        });
        image = await loadHDR(new Uint8Array(imageData));
    }
    return loadEnvironmentFromImage(image, view, luts);
}


async function loadEnvironmentFromImage(imageHDR, view, luts)
{
    // The environment uses the same type of samplers, textures and images as used in the glTF class
    // so we just use it as a template
    const environment = new glTF();

    //
    // Prepare samplers.
    //

    let samplerIdx = environment.samplers.length;

    environment.samplers.push(new gltfSampler(GL.LINEAR, GL.LINEAR, GL.CLAMP_TO_EDGE, GL.CLAMP_TO_EDGE, "DiffuseCubeMapSampler"));
    const diffuseCubeSamplerIdx = samplerIdx++;

    environment.samplers.push(new gltfSampler(GL.LINEAR, GL.LINEAR_MIPMAP_LINEAR, GL.CLAMP_TO_EDGE, GL.CLAMP_TO_EDGE, "SpecularCubeMapSampler"));
    const specularCubeSamplerIdx = samplerIdx++;

    environment.samplers.push(new gltfSampler(GL.LINEAR, GL.LINEAR_MIPMAP_LINEAR, GL.CLAMP_TO_EDGE, GL.CLAMP_TO_EDGE, "SheenCubeMapSampler"));
    const sheenCubeSamplerIdx = samplerIdx++;

    environment.samplers.push(new gltfSampler(GL.LINEAR, GL.LINEAR, GL.CLAMP_TO_EDGE, GL.CLAMP_TO_EDGE, "LUTSampler"));
    const lutSamplerIdx = samplerIdx++;

    //
    // Prepare images and textures.
    //

    let imageIdx = environment.images.length;

    let environmentFiltering = new iblSampler(view);

    environmentFiltering.init(imageHDR);
    environmentFiltering.filterAll();

    // Diffuse

    const diffuseGltfImage = new gltfImage(
        undefined,
        GL.TEXTURE_CUBE_MAP,
        0,
        undefined,
        "Diffuse",
        ImageMimeType.GLTEXTURE,
        environmentFiltering.lambertianTextureID
    );

    environment.images.push(diffuseGltfImage);

    const diffuseTexture = new gltfTexture(
        diffuseCubeSamplerIdx,
        [imageIdx++],
        GL.TEXTURE_CUBE_MAP,
        environmentFiltering.lambertianTextureID);

    environment.textures.push(diffuseTexture);

    environment.diffuseEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
    environment.diffuseEnvMap.generateMips = false;



    // Specular
    const specularGltfImage = new gltfImage(
        undefined,
        GL.TEXTURE_CUBE_MAP,
        0,
        undefined,
        "Specular",
        ImageMimeType.GLTEXTURE,
        environmentFiltering.ggxTextureID
    );

    environment.images.push(specularGltfImage);

    const specularTexture = new gltfTexture(
        specularCubeSamplerIdx,
        [imageIdx++],
        GL.TEXTURE_CUBE_MAP,
        environmentFiltering.ggxTextureID);

    environment.textures.push(specularTexture);

    environment.specularEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
    environment.specularEnvMap.generateMips = false;


    // Sheen
    const sheenGltfImage = new gltfImage(
        undefined,
        GL.TEXTURE_CUBE_MAP,
        0,
        undefined,
        "Sheen",
        ImageMimeType.GLTEXTURE,
        environmentFiltering.ggxTextureID
    );

    environment.images.push(sheenGltfImage);

    const sheenTexture = new gltfTexture(
        sheenCubeSamplerIdx,
        [imageIdx++],
        GL.TEXTURE_CUBE_MAP,
        environmentFiltering.sheenTextureID);

    environment.textures.push(sheenTexture);

    environment.sheenEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
    environment.sheenEnvMap.generateMips = false;

    /*
        // Diffuse

        const lambertian = new gltfImage(filteredEnvironmentsDirectoryPath + "/lambertian/diffuse.ktx2", GL.TEXTURE_CUBE_MAP);
        lambertian.mimeType = ImageMimeType.KTX2;
        environment.images.push(lambertian);
        environment.textures.push(new gltfTexture(diffuseCubeSamplerIdx, [imageIdx++], GL.TEXTURE_CUBE_MAP));
        environment.diffuseEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
        environment.diffuseEnvMap.generateMips = false;

        // Specular

        const specular = new gltfImage(filteredEnvironmentsDirectoryPath + "/ggx/specular.ktx2", GL.TEXTURE_CUBE_MAP);
        specular.mimeType = ImageMimeType.KTX2;
        environment.images.push(specular);
        environment.textures.push(new gltfTexture(specularCubeSamplerIdx, [imageIdx++], GL.TEXTURE_CUBE_MAP));
        environment.specularEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
        environment.specularEnvMap.generateMips = false;

        const specularImage = environment.images[environment.textures[environment.textures.length - 1].source];

        // Sheen

        const sheen = new gltfImage(filteredEnvironmentsDirectoryPath + "/charlie/sheen.ktx2", GL.TEXTURE_CUBE_MAP);
        sheen.mimeType = ImageMimeType.KTX2;
        environment.images.push(sheen);
        environment.textures.push(new gltfTexture(sheenCubeSamplerIdx, [imageIdx++], GL.TEXTURE_CUBE_MAP));
        environment.sheenEnvMap = new gltfTextureInfo(environment.textures.length - 1, 0, true);
        environment.sheenEnvMap.generateMips = false;*/

    //
    // Look Up Tables.
    //

    // GGX

    if (luts === undefined)
    {
        luts = {
            lut_ggx_file: "assets/images/lut_ggx.png",
            lut_charlie_file: "assets/images/lut_charlie.png",
            lut_sheen_E_file: "assets/images/lut_sheen_E.png",
        };
    }

    environment.images.push(new gltfImage(luts.lut_ggx_file, GL.TEXTURE_2D, 0, undefined, undefined, ImageMimeType.PNG));
    environment.textures.push(new gltfTexture(lutSamplerIdx, [imageIdx++], GL.TEXTURE_2D));

    environment.lut = new gltfTextureInfo(environment.textures.length - 1);
    environment.lut.generateMips = false;

    // Sheen
    // Charlie

    environment.images.push(new gltfImage(luts.lut_charlie_file, GL.TEXTURE_2D, 0, undefined, undefined, ImageMimeType.PNG));
    environment.textures.push(new gltfTexture(lutSamplerIdx, [imageIdx++], GL.TEXTURE_2D));

    environment.sheenLUT = new gltfTextureInfo(environment.textures.length - 1);
    environment.sheenLUT.generateMips = false;

    // Sheen E LUT

    environment.images.push(new gltfImage(luts.lut_sheen_E_file, GL.TEXTURE_2D, 0, undefined, undefined, ImageMimeType.PNG));
    environment.textures.push(new gltfTexture(lutSamplerIdx, [imageIdx++], GL.TEXTURE_2D));

    environment.sheenELUT = new gltfTextureInfo(environment.textures.length - 1);
    environment.sheenELUT.generateMips = false;

    await gltfLoader.loadImages(environment);

    environment.initGl(view.context);

    environment.mipCount = environmentFiltering.mipmapLevels;

    return environment;
}

export { DebugOutput, GltfState, GltfView, ToneMaps, combinePaths, computePrimitiveCentroids, getContainingFolder, getFileNameWithoutExtension, getIsGlb, getIsGltf, getIsHdr, glTF, initDracoLib, initKtxLib, loadEnvironment, loadGltf };
//# sourceMappingURL=gltf-viewer.module.js.map
