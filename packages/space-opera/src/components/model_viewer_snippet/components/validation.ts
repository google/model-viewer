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
import {customElement, html, internalProperty, query} from 'lit-element';

import {openModalStyles} from '../../../styles.css.js';
import {State} from '../../../types.js';
import {ConnectedLitElement} from '../../connected_lit_element/connected_lit_element';
import {getGltfUrl} from '../../model_viewer_preview/reducer.js';

@customElement('me-validation-modal')
export class ValidationModal extends ConnectedLitElement {
  static styles = openModalStyles;

  @internalProperty() isOpen: boolean = false;

  // @ts-ignore
  stateChanged(state: State) {
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  render() {
    return html`
<paper-dialog id="file-modal" modal ?opened=${this.isOpen}>
  <div class="FileModalContainer SnippetModal">
    <div class="FileModalHeader">
      <div>Validation</div>
    </div>
    <div class="FileModalCancel">
      <mwc-button unelevated icon="cancel" 
        @click=${this.close}>Close</mwc-button>
    </div>
  </div>
</paper-dialog>`;
  }
}

/**
 * Model validator
 */
@customElement('me-validation')
export class Validation extends ConnectedLitElement {
  @query('me-validation-modal#validation-modal')
  validationModal!: ValidationModal;
  @internalProperty() gltfUrl?: string;

  async validate(assetMap: Map<string, File>, response: Object) {
    const rootFile = this.gltfUrl;
    const rootPath = '/';
    return fetch(rootFile!)
        .then((response) => response.arrayBuffer())
        .then((buffer) => validateBytes(new Uint8Array(buffer), {
                externalResourceFunction: (uri) => this.resolveExternalResource(
                    uri, rootFile, rootPath, assetMap)
              }))
        .then((report) => this.setReport(report, response))
        .catch((e) => this.setReportException(e));
  }

  /**
   * Loads a fileset provided by user action.
   * @param  {Map<string, File>} fileMap
   */
  load(fileMap) {
    let rootFile;
    let rootPath;
    Array.from(fileMap).forEach(([path, file]) => {
      if (file.name.match(/\.(gltf|glb)$/)) {
        rootFile = file;
        rootPath = path.replace(file.name, '');
      }
    });

    if (!rootFile) {
      this.onError('No .gltf or .glb asset found.');
    }
    console.log('load: rootFile', rootFile);
    console.log('load: rootPath', rootPath);
    console.log('load: fileMap', fileMap) this.view(
        rootFile, rootPath, fileMap);
  }

  /**
   * Passes a model to the viewer, given file and resources.
   * @param  {File|string} rootFile
   * @param  {string} rootPath
   * @param  {Map<string, File>} fileMap
   */
  view(rootFile, rootPath, fileMap) {
    if (this.viewer)
      this.viewer.clear();

    const viewer = this.viewer || this.createViewer();

    const fileURL =
        typeof rootFile === 'string' ? rootFile : URL.createObjectURL(rootFile);

    const cleanup = () => {
      this.hideSpinner();
      if (typeof rootFile === 'object')
        URL.revokeObjectURL(fileURL);
    };

    viewer.load(fileURL, rootPath, fileMap)
        .catch((e) => this.onError(e))
        .then((gltf) => {
          console.log('fileUrl', fileURL);
          console.log('rootFile', rootFile);
          console.log('rootPath', rootPath);
          console.log('fileMap', fileMap);
          console.log('gltf', gltf);
          if (!this.options.kiosk) {
            this.validationCtrl.validate(fileURL, rootPath, fileMap, gltf);
          }
          cleanup();
        });
  }

  viewer.load(url, rootPath, assetMap) {
    const baseURL = LoaderUtils.extractUrlBase(url);

    // Load.
    return new Promise((resolve, reject) => {
      const manager = new LoadingManager();

      // Intercept and override relative URLs.
      manager.setURLModifier((url, path) => {
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
              .setKTX2Loader(
                  new KTX2Loader(manager).detectSupport(this.renderer));

      const blobURLs = [];

      loader.load(url, (gltf) => {
        const scene = gltf.scene || gltf.scenes[0];
        const clips = gltf.animations || [];

        if (!scene) {
          // Valid, but not supported by this viewer.
          throw new Error(
              'This model contains no scene, and cannot be viewed here. However,' +
              ' it may contain individual 3D resources.');
        }

        this.setContent(scene, clips);

        blobURLs.forEach(URL.revokeObjectURL);

        // See: https://github.com/google/draco/issues/349
        // DRACOLoader.releaseDecoderModule();

        resolve(gltf);
      }, undefined, reject);
    });
  }


  stateChanged(state: State) {
    const newGltfUrl = getGltfUrl(state);
    if (newGltfUrl !== this.gltfUrl && typeof newGltfUrl === 'string') {
      this.gltfUrl = newGltfUrl;
      this.validate();
    }
  }

  onOpen() {
    this.validationModal.open();
  }

  render() {
    return html`
    <mwc-button unelevated style="align-self: center;"
      @click=${this.onOpen}>
      Validation
    </mwc-button>
    <me-validation-modal id="validation-modal"></me-validation-modal>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-validation-modal': ValidationModal;
    'me-validation': Validation;
  }
}
