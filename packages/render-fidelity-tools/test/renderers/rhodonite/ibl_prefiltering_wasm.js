let wasm_bindgen;
(function() {
    const __exports = {};
    let wasm;

    const heap = new Array(32).fill(undefined);

    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        heap[idx] = obj;
        return idx;
    }

    let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

    cachedTextDecoder.decode();

    let cachegetUint8Memory0 = null;
    function getUint8Memory0() {
        if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
            cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachegetUint8Memory0;
    }

    function getStringFromWasm0(ptr, len) {
        return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
    }

function getObject(idx) { return heap[idx]; }

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachegetFloat64Memory0 = null;
function getFloat64Memory0() {
    if (cachegetFloat64Memory0 === null || cachegetFloat64Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachegetFloat64Memory0;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);

            } else {
                state.a = a;
            }
        }
    };
    real.original = state;

    return real;
}
function __wbg_adapter_26(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hd685b44b493b72c9(arg0, arg1, addHeapObject(arg2));
}

/**
* @param {any} webgl_context
*/
__exports.init_webgl_extensions = function(webgl_context) {
    wasm.init_webgl_extensions(addHeapObject(webgl_context));
};

/**
* @param {string} url
* @returns {any}
*/
__exports.request_text = function(url) {
    var ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    var ret = wasm.request_text(ptr0, len0);
    return takeObject(ret);
};

/**
* @param {string} url
* @returns {any}
*/
__exports.request_binary = function(url) {
    var ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    var ret = wasm.request_binary(ptr0, len0);
    return takeObject(ret);
};

/**
* @returns {any}
*/
__exports.test_array = function() {
    var ret = wasm.test_array();
    return takeObject(ret);
};

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

function getArrayU8FromWasm0(ptr, len) {
    return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachegetFloat32Memory0 = null;
function getFloat32Memory0() {
    if (cachegetFloat32Memory0 === null || cachegetFloat32Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat32Memory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachegetFloat32Memory0;
}

function getArrayF32FromWasm0(ptr, len) {
    return getFloat32Memory0().subarray(ptr / 4, ptr / 4 + len);
}
function __wbg_adapter_191(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures__invoke2_mut__h99a8a5b17106f958(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

/**
*/
class CubeMapPrefilter {

    static __wrap(ptr) {
        const obj = Object.create(CubeMapPrefilter.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cubemapprefilter_free(ptr);
    }
    /**
    * @param {any} webgl_context
    * @param {number} cubemap_size
    * @param {number} irradiance_cubemap_size
    * @param {number} pmrem_cubemap_size
    * @param {number} pmrem_cubemap_mip_count
    * @param {number} brdf_lut_size
    * @param {number} sample_count
    */
    constructor(webgl_context, cubemap_size, irradiance_cubemap_size, pmrem_cubemap_size, pmrem_cubemap_mip_count, brdf_lut_size, sample_count) {
        var ret = wasm.cubemapprefilter_new(addHeapObject(webgl_context), cubemap_size, irradiance_cubemap_size, pmrem_cubemap_size, pmrem_cubemap_mip_count, brdf_lut_size, sample_count);
        return CubeMapPrefilter.__wrap(ret);
    }
    /**
    * @param {any} webgl_context
    * @param {any} data
    */
    load_hdr_image(webgl_context, data) {
        wasm.cubemapprefilter_load_hdr_image(this.ptr, addHeapObject(webgl_context), addHeapObject(data));
    }
    /**
    * @returns {any}
    */
    get_hdr_image_width() {
        var ret = wasm.cubemapprefilter_get_hdr_image_width(this.ptr);
        return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    get_hdr_image_height() {
        var ret = wasm.cubemapprefilter_get_hdr_image_height(this.ptr);
        return takeObject(ret);
    }
    /**
    * @param {any} webgl_context
    * @returns {any}
    */
    process(webgl_context) {
        var ret = wasm.cubemapprefilter_process(this.ptr, addHeapObject(webgl_context));
        return takeObject(ret);
    }
    /**
    * @param {any} webgl_context
    * @param {any} view_data
    * @param {any} proj_data
    * @returns {any}
    */
    draw_env(webgl_context, view_data, proj_data) {
        var ret = wasm.cubemapprefilter_draw_env(this.ptr, addHeapObject(webgl_context), addHeapObject(view_data), addHeapObject(proj_data));
        return takeObject(ret);
    }
    /**
    * @param {any} webgl_context
    * @param {any} metallic_data
    * @param {any} roughness_data
    * @param {any} albedo_data
    * @param {any} local_to_world_matrix
    * @param {any} camera_position_data
    * @param {any} view_data
    * @param {any} proj_data
    * @returns {any}
    */
    draw_pbr(webgl_context, metallic_data, roughness_data, albedo_data, local_to_world_matrix, camera_position_data, view_data, proj_data) {
        var ret = wasm.cubemapprefilter_draw_pbr(this.ptr, addHeapObject(webgl_context), addHeapObject(metallic_data), addHeapObject(roughness_data), addHeapObject(albedo_data), addHeapObject(local_to_world_matrix), addHeapObject(camera_position_data), addHeapObject(view_data), addHeapObject(proj_data));
        return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    get_hdr_cubemap_texture() {
        var ret = wasm.cubemapprefilter_get_hdr_cubemap_texture(this.ptr);
        return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    get_brdf_lut_texture() {
        var ret = wasm.cubemapprefilter_get_brdf_lut_texture(this.ptr);
        return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    get_irradiance_cubemap_texture() {
        var ret = wasm.cubemapprefilter_get_irradiance_cubemap_texture(this.ptr);
        return takeObject(ret);
    }
    /**
    * @returns {any}
    */
    get_pmrem_cubemap_texture() {
        var ret = wasm.cubemapprefilter_get_pmrem_cubemap_texture(this.ptr);
        return takeObject(ret);
    }
    /**
    * @param {any} webgl_context
    * @param {number} cube_face_target
    * @returns {any}
    */
    hdr_cubemap_texture_to_arrybuffer(webgl_context, cube_face_target) {
        var ret = wasm.cubemapprefilter_hdr_cubemap_texture_to_arrybuffer(this.ptr, addHeapObject(webgl_context), cube_face_target);
        return takeObject(ret);
    }
    /**
    * @param {any} webgl_context
    * @param {number} cube_face_target
    * @returns {any}
    */
    irradiance_cubemap_texture_to_arrybuffer(webgl_context, cube_face_target) {
        var ret = wasm.cubemapprefilter_irradiance_cubemap_texture_to_arrybuffer(this.ptr, addHeapObject(webgl_context), cube_face_target);
        return takeObject(ret);
    }
    /**
    * @param {any} webgl_context
    * @param {number} cube_face_target
    * @param {number} mip_level
    * @returns {any}
    */
    pmrem_cubemap_texture_to_arrybuffer(webgl_context, cube_face_target, mip_level) {
        var ret = wasm.cubemapprefilter_pmrem_cubemap_texture_to_arrybuffer(this.ptr, addHeapObject(webgl_context), cube_face_target, mip_level);
        return takeObject(ret);
    }
    /**
    * @returns {number}
    */
    hdr_cubemap_texture_size() {
        var ret = wasm.cubemapprefilter_hdr_cubemap_texture_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    irradiance_cubemap_texture_size() {
        var ret = wasm.cubemapprefilter_irradiance_cubemap_texture_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {number} mip_level
    * @returns {number}
    */
    pmrem_cubemap_texture_size(mip_level) {
        var ret = wasm.cubemapprefilter_pmrem_cubemap_texture_size(this.ptr, mip_level);
        return ret >>> 0;
    }
    /**
    * @returns {number}
    */
    pmrem_cubemap_mip_count() {
        var ret = wasm.cubemapprefilter_pmrem_cubemap_mip_count(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {any} webgl_context
    * @returns {any}
    */
    brdf_texture_to_arrybuffer(webgl_context) {
        var ret = wasm.cubemapprefilter_brdf_texture_to_arrybuffer(this.ptr, addHeapObject(webgl_context));
        return takeObject(ret);
    }
    /**
    * @returns {number}
    */
    brdf_texture_size() {
        var ret = wasm.cubemapprefilter_brdf_texture_size(this.ptr);
        return ret >>> 0;
    }
    /**
    * @param {any} webgl_context
    */
    capture_texture(webgl_context) {
        wasm.cubemapprefilter_capture_texture(this.ptr, addHeapObject(webgl_context));
    }
    /**
    * @returns {any}
    */
    get_capture_texture() {
        var ret = wasm.cubemapprefilter_get_capture_texture(this.ptr);
        return takeObject(ret);
    }
}
__exports.CubeMapPrefilter = CubeMapPrefilter;
/**
*/
class DebugRenderer {

    static __wrap(ptr) {
        const obj = Object.create(DebugRenderer.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_debugrenderer_free(ptr);
    }
    /**
    * @param {any} webgl_context
    */
    constructor(webgl_context) {
        var ret = wasm.debugrenderer_new(addHeapObject(webgl_context));
        return DebugRenderer.__wrap(ret);
    }
    /**
    * @param {any} webgl_context
    * @param {any} data
    */
    load_hdr_image(webgl_context, data) {
        wasm.debugrenderer_load_hdr_image(this.ptr, addHeapObject(webgl_context), addHeapObject(data));
    }
    /**
    * @param {any} webgl_context
    * @param {any} x
    * @param {any} y
    * @param {any} w
    * @param {any} h
    * @param {any} _lod_bias
    * @returns {any}
    */
    draw_unwrapped_cube_with_debug_shader(webgl_context, x, y, w, h, _lod_bias) {
        var ret = wasm.debugrenderer_draw_unwrapped_cube_with_debug_shader(this.ptr, addHeapObject(webgl_context), addHeapObject(x), addHeapObject(y), addHeapObject(w), addHeapObject(h), addHeapObject(_lod_bias));
        return takeObject(ret);
    }
    /**
    * @param {any} webgl_context
    * @param {any} gl_texture
    * @param {any} x
    * @param {any} y
    * @param {any} w
    * @param {any} h
    * @param {any} lod_bias
    * @returns {any}
    */
    draw_unwrapped_cube(webgl_context, gl_texture, x, y, w, h, lod_bias) {
        var ret = wasm.debugrenderer_draw_unwrapped_cube(this.ptr, addHeapObject(webgl_context), addHeapObject(gl_texture), addHeapObject(x), addHeapObject(y), addHeapObject(w), addHeapObject(h), addHeapObject(lod_bias));
        return takeObject(ret);
    }
    /**
    * @param {any} webgl_context
    * @param {any} x
    * @param {any} y
    * @param {any} w
    * @param {any} h
    * @param {any} lod_bias
    * @returns {any}
    */
    draw_unwrapped_cube_with_debug_cube_texture(webgl_context, x, y, w, h, lod_bias) {
        var ret = wasm.debugrenderer_draw_unwrapped_cube_with_debug_cube_texture(this.ptr, addHeapObject(webgl_context), addHeapObject(x), addHeapObject(y), addHeapObject(w), addHeapObject(h), addHeapObject(lod_bias));
        return takeObject(ret);
    }
}
__exports.DebugRenderer = DebugRenderer;
/**
*/
class PreviewRGBEImage {

    static __wrap(ptr) {
        const obj = Object.create(PreviewRGBEImage.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_previewrgbeimage_free(ptr);
    }
    /**
    * @param {any} webgl_context
    */
    constructor(webgl_context) {
        var ret = wasm.previewrgbeimage_new(addHeapObject(webgl_context));
        return PreviewRGBEImage.__wrap(ret);
    }
    /**
    * @param {any} webgl_context
    * @param {any} data
    * @param {any} width
    * @param {any} height
    */
    load_rgbe_image(webgl_context, data, width, height) {
        wasm.previewrgbeimage_load_rgbe_image(this.ptr, addHeapObject(webgl_context), addHeapObject(data), addHeapObject(width), addHeapObject(height));
    }
    /**
    * @param {any} webgl_context
    * @param {any} x
    * @param {any} y
    * @param {any} w
    * @param {any} h
    * @returns {any}
    */
    draw(webgl_context, x, y, w, h) {
        var ret = wasm.previewrgbeimage_draw(this.ptr, addHeapObject(webgl_context), addHeapObject(x), addHeapObject(y), addHeapObject(w), addHeapObject(h));
        return takeObject(ret);
    }
}
__exports.PreviewRGBEImage = PreviewRGBEImage;

async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

async function init(input) {
    if (typeof input === 'undefined') {
        let src;
        if (typeof document === 'undefined') {
            src = location.href;
        } else {
            src = document.currentScript.src;
        }
        input = src.replace(/\.js$/, '_bg.wasm');
    }
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_number_new = function(arg0) {
        var ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        var ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        var ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbg_instanceof_Window_11e25482011fc506 = function(arg0) {
        var ret = getObject(arg0) instanceof Window;
        return ret;
    };
    imports.wbg.__wbg_fetch_eb9fd115eef29d0c = function(arg0, arg1) {
        var ret = getObject(arg0).fetch(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_Response_d61ff4c524b8dbc4 = function(arg0) {
        var ret = getObject(arg0) instanceof Response;
        return ret;
    };
    imports.wbg.__wbg_arrayBuffer_b7c95af83e1e2705 = function() { return handleError(function (arg0) {
        var ret = getObject(arg0).arrayBuffer();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_text_7c3304aebfcffa1a = function() { return handleError(function (arg0) {
        var ret = getObject(arg0).text();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newwithstrandinit_155cb1478824b198 = function() { return handleError(function (arg0, arg1, arg2) {
        var ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_bufferData_fc1c7f6f7937aa2f = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
    };
    imports.wbg.__wbg_readPixels_b660acaeb93b7ae6 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
        getObject(arg0).readPixels(arg1, arg2, arg3, arg4, arg5 >>> 0, arg6 >>> 0, getObject(arg7));
    }, arguments) };
    imports.wbg.__wbg_texImage2D_c3b3326e5afec2cb = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
        getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
    }, arguments) };
    imports.wbg.__wbg_texImage2D_875a12810798bd91 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
        getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9 === 0 ? undefined : getArrayU8FromWasm0(arg9, arg10));
    }, arguments) };
    imports.wbg.__wbg_texSubImage2D_49734ace3c625b9a = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
        getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
    }, arguments) };
    imports.wbg.__wbg_uniformMatrix4fv_ec627ec788c1b744 = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).uniformMatrix4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
    };
    imports.wbg.__wbg_activeTexture_e014ee7b74cc1fca = function(arg0, arg1) {
        getObject(arg0).activeTexture(arg1 >>> 0);
    };
    imports.wbg.__wbg_attachShader_6124f72095cdcf11 = function(arg0, arg1, arg2) {
        getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
    };
    imports.wbg.__wbg_bindBuffer_275d909129fba2de = function(arg0, arg1, arg2) {
        getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__wbg_bindFramebuffer_29a489c53aeadc0a = function(arg0, arg1, arg2) {
        getObject(arg0).bindFramebuffer(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__wbg_bindRenderbuffer_1ddc77aab39d4644 = function(arg0, arg1, arg2) {
        getObject(arg0).bindRenderbuffer(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__wbg_bindTexture_f00c4b7db89d6a11 = function(arg0, arg1, arg2) {
        getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
    };
    imports.wbg.__wbg_checkFramebufferStatus_bf99999b983319bd = function(arg0, arg1) {
        var ret = getObject(arg0).checkFramebufferStatus(arg1 >>> 0);
        return ret;
    };
    imports.wbg.__wbg_clear_65a182ed82b4f282 = function(arg0, arg1) {
        getObject(arg0).clear(arg1 >>> 0);
    };
    imports.wbg.__wbg_clearColor_e0034d2b65202787 = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).clearColor(arg1, arg2, arg3, arg4);
    };
    imports.wbg.__wbg_compileShader_42fdaee532cdb8e4 = function(arg0, arg1) {
        getObject(arg0).compileShader(getObject(arg1));
    };
    imports.wbg.__wbg_copyTexSubImage2D_4e74ac55bae3ed88 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8) {
        getObject(arg0).copyTexSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8);
    };
    imports.wbg.__wbg_createBuffer_3691dcedc890b4e8 = function(arg0) {
        var ret = getObject(arg0).createBuffer();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_createFramebuffer_73c45b8c2a785dba = function(arg0) {
        var ret = getObject(arg0).createFramebuffer();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_createProgram_8edfd62e0586640d = function(arg0) {
        var ret = getObject(arg0).createProgram();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_createRenderbuffer_116cfcd1ddc3b495 = function(arg0) {
        var ret = getObject(arg0).createRenderbuffer();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_createShader_7033c38612c5688d = function(arg0, arg1) {
        var ret = getObject(arg0).createShader(arg1 >>> 0);
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_createTexture_65cc306909332417 = function(arg0) {
        var ret = getObject(arg0).createTexture();
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_cullFace_7e16e2183286b4ec = function(arg0, arg1) {
        getObject(arg0).cullFace(arg1 >>> 0);
    };
    imports.wbg.__wbg_disable_cb4b0073c4406d0d = function(arg0, arg1) {
        getObject(arg0).disable(arg1 >>> 0);
    };
    imports.wbg.__wbg_drawArrays_0b3f5c1007f09b54 = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).drawArrays(arg1 >>> 0, arg2, arg3);
    };
    imports.wbg.__wbg_drawElements_4ec52596f5751396 = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
    };
    imports.wbg.__wbg_enable_8f92d01df1a4c77c = function(arg0, arg1) {
        getObject(arg0).enable(arg1 >>> 0);
    };
    imports.wbg.__wbg_enableVertexAttribArray_4b127e0ecccd536c = function(arg0, arg1) {
        getObject(arg0).enableVertexAttribArray(arg1 >>> 0);
    };
    imports.wbg.__wbg_flush_9faa2c9932de28f9 = function(arg0) {
        getObject(arg0).flush();
    };
    imports.wbg.__wbg_framebufferRenderbuffer_634c46c93b74a802 = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4));
    };
    imports.wbg.__wbg_framebufferTexture2D_73cc0dcc63da2ffc = function(arg0, arg1, arg2, arg3, arg4, arg5) {
        getObject(arg0).framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4), arg5);
    };
    imports.wbg.__wbg_generateMipmap_df35e7716b224153 = function(arg0, arg1) {
        getObject(arg0).generateMipmap(arg1 >>> 0);
    };
    imports.wbg.__wbg_getAttribLocation_e3a341ce3579c6e6 = function(arg0, arg1, arg2, arg3) {
        var ret = getObject(arg0).getAttribLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
        return ret;
    };
    imports.wbg.__wbg_getExtension_adbea5bb34c458b0 = function() { return handleError(function (arg0, arg1, arg2) {
        var ret = getObject(arg0).getExtension(getStringFromWasm0(arg1, arg2));
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getParameter_0b14f998f44dc570 = function() { return handleError(function (arg0, arg1) {
        var ret = getObject(arg0).getParameter(arg1 >>> 0);
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_getProgramInfoLog_0b10742df7a2ebea = function(arg0, arg1, arg2) {
        var ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
        var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_getProgramParameter_bb277a1d000dd7a1 = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getShaderInfoLog_950ab0c3fc7afa37 = function(arg0, arg1, arg2) {
        var ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
        var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbg_getShaderParameter_54891c5545a79869 = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).getShaderParameter(getObject(arg1), arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getUniformLocation_8b0d07c81923dc0a = function(arg0, arg1, arg2, arg3) {
        var ret = getObject(arg0).getUniformLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbg_linkProgram_0be4bd888f743eb0 = function(arg0, arg1) {
        getObject(arg0).linkProgram(getObject(arg1));
    };
    imports.wbg.__wbg_renderbufferStorage_51304869bb2aad8c = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
    };
    imports.wbg.__wbg_shaderSource_c666880b620c8f34 = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
    };
    imports.wbg.__wbg_texParameteri_dd58ff2ef56511b2 = function(arg0, arg1, arg2, arg3) {
        getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
    };
    imports.wbg.__wbg_uniform1f_b57eab43144a26b1 = function(arg0, arg1, arg2) {
        getObject(arg0).uniform1f(getObject(arg1), arg2);
    };
    imports.wbg.__wbg_uniform1i_e39f64f3710aa2dc = function(arg0, arg1, arg2) {
        getObject(arg0).uniform1i(getObject(arg1), arg2);
    };
    imports.wbg.__wbg_uniform3f_35b8f0f096e8197a = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).uniform3f(getObject(arg1), arg2, arg3, arg4);
    };
    imports.wbg.__wbg_useProgram_fb4984fb080bcd61 = function(arg0, arg1) {
        getObject(arg0).useProgram(getObject(arg1));
    };
    imports.wbg.__wbg_vertexAttribPointer_d00262e9bf7a3742 = function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
        getObject(arg0).vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
    };
    imports.wbg.__wbg_viewport_39356c8cdec98b8b = function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).viewport(arg1, arg2, arg3, arg4);
    };
    imports.wbg.__wbg_log_9a99fb1af846153b = function(arg0) {
        console.log(getObject(arg0));
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        var ret = false;
        return ret;
    };
    imports.wbg.__wbg_get_b7bbf50adcc94294 = function(arg0, arg1) {
        var ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_isArray_92d4d182f6ebc896 = function(arg0) {
        var ret = Array.isArray(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_1ae2a91a8421001f = function(arg0) {
        var ret = getObject(arg0) instanceof ArrayBuffer;
        return ret;
    };
    imports.wbg.__wbg_newnoargs_9fdd8f3961dd1bee = function(arg0, arg1) {
        var ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_ba36642bd901572b = function() { return handleError(function (arg0, arg1) {
        var ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_call_3fc07b7d5fc9022d = function() { return handleError(function (arg0, arg1, arg2) {
        var ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_edbe38a4e21329dd = function() {
        var ret = new Object();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_c143a4f563f78c4e = function(arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_191(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            var ret = new Promise(cb0);
            return addHeapObject(ret);
        } finally {
            state0.a = state0.b = 0;
        }
    };
    imports.wbg.__wbg_resolve_cae3d8f752f5db88 = function(arg0) {
        var ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_c2361a9d5c9a4fcb = function(arg0, arg1) {
        var ret = getObject(arg0).then(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_6c9a4bf55755f9b8 = function(arg0, arg1, arg2) {
        var ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_globalThis_e0d21cabc6630763 = function() { return handleError(function () {
        var ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_self_bb69a836a72ec6e9 = function() { return handleError(function () {
        var ret = self.self;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_window_3304fc4b414c9693 = function() { return handleError(function () {
        var ret = window.window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_8463719227271676 = function() { return handleError(function () {
        var ret = global.global;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_35a948b295bacf9c = function(arg0) {
        var ret = new Int32Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getindex_68f63c7910c2a6e2 = function(arg0, arg1) {
        var ret = getObject(arg0)[arg1 >>> 0];
        return ret;
    };
    imports.wbg.__wbg_instanceof_Uint8Array_04909239e1470be1 = function(arg0) {
        var ret = getObject(arg0) instanceof Uint8Array;
        return ret;
    };
    imports.wbg.__wbg_new_e8101319e4cf95fc = function(arg0) {
        var ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithlength_a8d1dbcbe703a5c6 = function(arg0) {
        var ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_e57ad1f2ce812c03 = function(arg0, arg1, arg2) {
        var ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_length_2d56cb37075fcfb1 = function(arg0) {
        var ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_set_e8ae7b27314e8b98 = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_newwithlength_1427bc3dd8de1a7d = function(arg0) {
        var ret = new Uint16Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_9f0558f3c1740b0a = function(arg0, arg1, arg2) {
        var ret = new Uint16Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_length_50230adc366bab82 = function(arg0) {
        var ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_set_40dc3c3bf208c61e = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_new_d69bbe3db485d457 = function(arg0) {
        var ret = new Float32Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_abfc24c57fd08e6d = function(arg0, arg1, arg2) {
        var ret = new Float32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_length_523cf4a01041a7a6 = function(arg0) {
        var ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_set_0fa56ca792d65861 = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_buffer_9e184d6f785de5ed = function(arg0) {
        var ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_get_800098c980b31ea2 = function() { return handleError(function (arg0, arg1) {
        var ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_set_73349fc4814e0fc6 = function() { return handleError(function (arg0, arg1, arg2) {
        var ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        return ret;
    }, arguments) };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        var ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        var ret = typeof(obj) === 'number' ? obj : undefined;
        getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
        const v = getObject(arg0);
        var ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
        return ret;
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        var ret = debugString(getObject(arg1));
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_rethrow = function(arg0) {
        throw takeObject(arg0);
    };
    imports.wbg.__wbindgen_memory = function() {
        var ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper5293 = function(arg0, arg1, arg2) {
        var ret = makeMutClosure(arg0, arg1, 76, __wbg_adapter_26);
        return addHeapObject(ret);
    };

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }



    const { instance, module } = await load(await input, imports);

    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;

    return wasm;
}

wasm_bindgen = Object.assign(init, __exports);

})();
