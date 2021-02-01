/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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
 *
 */

import {validateBytes} from 'gltf-validator';
import {LoaderUtils, LoadingManager, WebGLRenderer} from 'three';
import {DRACOLoader} from 'three/examples/jsm/loaders/DRACOLoader.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/examples/jsm/loaders/KTX2Loader.js';

const SEVERITY_MAP = ['Errors', 'Warnings', 'Infos', 'Hints'];

/**
 * Loads a fileset provided by user action.
 * @param  {Map<string, File>} fileMap
 */
export function load(fileMap) {
  let rootFile;
  let rootPath;
  Array.from(fileMap).forEach(([path, file]) => {
    if (file.name.match(/\.(gltf|glb)$/)) {
      rootFile = file;
      rootPath = path.replace(file.name, '');
    }
  });

  if (!rootFile) {
    console.log('No .gltf or .glb asset found');
    // onError('No .gltf or .glb asset found.');
  }
  console.log('load: rootFile', rootFile);
  console.log('load: rootPath', rootPath);
  console.log('load: fileMap', fileMap);
  view(rootFile, rootPath, fileMap);
}

/**
 * Passes a model to the viewer, given file and resources.
 * @param  {File|string} rootFile
 * @param  {string} rootPath
 * @param  {Map<string, File>} fileMap
 */
async function view(rootFile, rootPath, fileMap) {
  const gltf = await viewerLoad(rootFile, rootPath, fileMap);
  validate(rootFile, rootPath, fileMap, gltf);
}

async function viewerLoad(url: string, rootPath: string, assetMap) {
  const baseURL = LoaderUtils.extractUrlBase(url);
  const renderer = new WebGLRenderer({antialias: true});

  // Load.
  return new Promise((resolve, reject) => {
    const manager = new LoadingManager();

    // Intercept and override relative URLs.
    manager.setURLModifier((url: string, path: string) => {
      // URIs in a glTF file may be escaped, or not. Assume that assetMap is
      // from an un-escaped source, and decode all URIs before lookups.
      // See: https://github.com/donmccurdy/three-gltf-viewer/issues/146
      const normalizedURL = rootPath +
          decodeURI(url).replace(baseURL, '').replace(/^(\.?\/)/, '');

      if (assetMap.has(normalizedURL)) {
        const blob = assetMap.get(normalizedURL);
        const blobURL = URL.createObjectURL(blob);
        blobURLs.push(blobURL);
        return blobURL;
      }

      return (path || '') + url;
    });

    const loader =
        new GLTFLoader(manager)
            .setCrossOrigin('anonymous')
            .setDRACOLoader(
                new DRACOLoader(manager).setDecoderPath('assets/wasm/'))
            .setKTX2Loader(new KTX2Loader(manager).detectSupport(renderer));

    const blobURLs: string[] = [];

    loader.load(url, (gltf) => {
      const scene = gltf.scene || gltf.scenes[0];

      if (!scene) {
        // Valid, but not supported by this viewer.
        throw new Error(
            'This model contains no scene, and cannot be viewed here. However,' +
            ' it may contain individual 3D resources.');
      }

      blobURLs.forEach(URL.revokeObjectURL);

      // See: https://github.com/google/draco/issues/349
      // DRACOLoader.releaseDecoderModule();

      resolve(gltf);
    }, undefined, reject);
  });
}

export async function validate(
    rootFile, rootPath, assetMap: Map<string, File>, gltf) {
  return fetch(rootFile!)
      .then((response) => response.arrayBuffer())
      .then((buffer) => validateBytes(new Uint8Array(buffer), {
              externalResourceFunction: (uri) =>
                  resolveExternalResource(uri, rootFile, rootPath, assetMap)
            }))
      .then((report) => setReport(report, gltf))
      .catch((e) => setReportException(e));
}

/**
 * Loads a resource (either locally or from the network) and returns it.
 * @param  {string} uri
 * @param  {string} rootFile
 * @param  {string} rootPath
 * @param  {Map<string, File>} assetMap
 * @return {Promise<Uint8Array>}
 */
function resolveExternalResource(uri, rootFile, rootPath, assetMap) {
  const baseURL = LoaderUtils.extractUrlBase(rootFile);
  const normalizedURL = rootPath +
      decodeURI(uri)  // validator applies URI encoding.
          .replace(baseURL, '')
          .replace(/^(\.?\/)/, '');

  let objectURL;

  if (assetMap.has(normalizedURL)) {
    const object = assetMap.get(normalizedURL);
    objectURL = URL.createObjectURL(object);
  }

  return fetch(objectURL || (baseURL + uri))
      .then((response) => response.arrayBuffer())
      .then((buffer) => {
        if (objectURL)
          URL.revokeObjectURL(objectURL);
        return new Uint8Array(buffer);
      });
}

/**
 * @param {GLTFValidator.Report} report
 */
function setReport(report, response) {
  report.issues.maxSeverity = -1;
  SEVERITY_MAP.forEach((severity, index) => {
    if (report.issues[`num${severity}`] > 0 &&
        report.issues.maxSeverity === -1) {
      report.issues.maxSeverity = index;
    }
  });
  report.errors = report.issues.messages.filter((msg) => msg.severity === 0);
  report.warnings = report.issues.messages.filter((msg) => msg.severity === 1);
  report.infos = report.issues.messages.filter((msg) => msg.severity === 2);
  report.hints = report.issues.messages.filter((msg) => msg.severity === 3);
  groupMessages(report);
  setResponse(report, response);
  console.log('report', report);
}

/**
 * @param {Object} response
 */
function setResponse(report, response) {
  const json = response && response.parser && response.parser.json;

  if (!json)
    return;

  if (json.asset && json.asset.extras) {
    const extras = json.asset.extras;
    report.info.extras = {};
    if (extras.author) {
      report.info.extras.author = linkify(escapeHTML(extras.author));
    }
    if (extras.license) {
      report.info.extras.license = linkify(escapeHTML(extras.license));
    }
    if (extras.source) {
      report.info.extras.source = linkify(escapeHTML(extras.source));
    }
    if (extras.title) {
      report.info.extras.title = extras.title;
    }
  }
}

/**
 * @param {GLTFValidator.Report} report
 */
function groupMessages(report) {
  const CODES = {
    ACCESSOR_NON_UNIT: {
      message: '{count} accessor elements not of unit length: 0. [AGGREGATED]',
      pointerCounts: {}
    },
    ACCESSOR_ANIMATION_INPUT_NON_INCREASING: {
      message:
          '{count} animation input accessor elements not in ascending order. [AGGREGATED]',
      pointerCounts: {}
    }
  };

  report.errors.forEach((message) => {
    if (!CODES[message.code])
      return;
    if (!CODES[message.code].pointerCounts[message.pointer]) {
      CODES[message.code].pointerCounts[message.pointer] = 0;
    }
    CODES[message.code].pointerCounts[message.pointer]++;
  });
  report.errors = report.errors.filter((message) => {
    if (!CODES[message.code])
      return true;
    if (!CODES[message.code].pointerCounts[message.pointer])
      return true;
    return CODES[message.code].pointerCounts[message.pointer] < 2;
  });
  Object.keys(CODES).forEach((code) => {
    Object.keys(CODES[code].pointerCounts).forEach((pointer) => {
      report.errors.push({
        code: code,
        pointer: pointer,
        message: CODES[code].message.replace(
            '{count}', CODES[code].pointerCounts[pointer])
      });
    });
  });
}

function escapeHTML(unsafe) {
  return unsafe.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
}

function linkify(text) {
  const urlPattern =
      /\b(?:https?):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
  const emailAddressPattern =
      /(([a-zA-Z0-9_\-\.]+)@[a-zA-Z_]+?(?:\.[a-zA-Z]{2,6}))+/gim;
  return text.replace(urlPattern, '<a target="_blank" href="$&">$&</a>')
      .replace(
          emailAddressPattern, '<a target="_blank" href="mailto:$1">$1</a>');
}
