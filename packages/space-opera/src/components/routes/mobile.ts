/**
 * @license
 * Copyright 2020 Google LLC. All Rights Reserved.
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

import {customElement, html, LitElement} from 'lit-element';
import {styles} from './styles.css.js';

/**
 * The main model-viewer editor component for routing.
 */
@customElement('routes-mobile')
export class EditorMobile extends LitElement {
  static styles = styles;

  get pipingServerId(): any {
    // TODO: catch errors
    return window.location.search.replace('?id=', '');
  };

  get srcPipeUrl(): string {
    return `https://ppng.io/modelviewereditor-srcs-${this.pipingServerId}`;
  }

  get snippetPipeUrl(): string {
    return `https://ppng.io/modelviewereditor-state-${this.pipingServerId}`;
  }

  waitForFetch() {
    fetch(this.srcPipeUrl)
        .then(response => response.json())
        .then(json => console.log('urls', json));

    // TODO: Add in dispatches for gltf, poster, env image

    fetch(this.snippetPipeUrl)
        .then(response => response.json())
        .then(json => console.log('snippet', json));

    // TODO: Add in dispatches for new snippet
  }

  render() {
    return html`
  <model-editor @click=${this.waitForFetch}>
    <div class="app">
      <div class="editor-body-root">
        <div class="mvContainer">
          <model-viewer-preview id="editing_adapter">
          </model-viewer-preview>
        </div>
      </div>
    </div>
  </model-editor>
`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'routes-mobile': EditorMobile;
  }
}
