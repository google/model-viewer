/*
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export const assertContext = (context) => {
  if (context == null) {
    throw new Error('WebGL is not available!');
  }
  return context;
};

export const getContext = (canvas, options) => assertContext(
    canvas.getContext('webgl', options) ||
    canvas.getContext('experimental-webgl', options));

/**
 * Patch the values reported by WebGLRenderingContext's
 * extension store to fix compatibility issues.
 */
export const applyExtensionCompatibility = gl => {
  const testShaders = {
    // In some Firefox builds (mobile Android on Pixel at least),
    // EXT_shader_texture_lod is reported as being supported, but
    // fails in practice.
    // @see https://bugzilla.mozilla.org/show_bug.cgi?id=1451287
    'EXT_shader_texture_lod': `
      #extension GL_EXT_shader_texture_lod : enable
      precision mediump float;
      uniform sampler2D tex;
      void main() {
        gl_FragColor = texture2DLodEXT(tex, vec2(0.0, 0.0), 0.0);
      }`,
  };

  function confirmExtension(gl, name) {
    const shader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(shader, testShaders[name]);
    gl.compileShader(shader);

    const status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

    gl.deleteShader(shader);
    return status;
  }

  const getExtension = gl.getExtension;
  gl.getExtension = name => {
    let extension;

    if (testShaders[name]) {
      extension = getExtension.call(gl, name);
      if (extension && !confirmExtension(gl, name)) {
        extension = null;
      }
    } else {
      extension = getExtension.call(gl, name);
    }

    return extension;
  };
};
