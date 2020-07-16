import '../shared/expandable_content/expandable_tab.js';
import '@material/mwc-button';

import {ModelViewerElement} from '@google/model-viewer';
import {createSafeObjectURL} from '@google/model-viewer-editing-adapter/lib/util/create_object_url.js'
import {customElement, html, internalProperty} from 'lit-element';

import {dispatchSetPoster} from '../../redux/poster_dispatcher.js';
import {State} from '../../redux/space_opera_base.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';

import {styles} from './poster_controls.css';

/** Allow users to create / display a poster. */
@customElement('me-poster-controls')
export class PosterControlsElement extends ConnectedLitElement {
  static styles = styles;

  @internalProperty() poster?: string;

  private modelViewer?: ModelViewerElement;

  stateChanged(state: State) {
    this.modelViewer = state.modelViewer;
    this.poster = state.config.poster;
  }

  render() {
    return html`
      <me-expandable-tab tabName="Poster">
        <div slot="content">
          <div class="ButtonContainer">
            <mwc-button unelevated
              @click="${this.onCreatePoster}">Create Poster</mwc-button>
          </div>
          <div class="ButtonContainer">
            <mwc-button unelevated
              @click="${this.onDisplayPoster}"
              ?disabled="${!this.poster}">Display Poster</mwc-button>
          </div>
        </div>
      </me-expandable-tab>
        `;
  }

  async onCreatePoster() {
    if (!this.modelViewer)
      return;
    const posterUrl = createSafeObjectURL(await this.modelViewer.toBlob());
    dispatchSetPoster(posterUrl.unsafeUrl);
  }

  onDisplayPoster() {
    if (!this.modelViewer)
      return;
    const src = this.modelViewer.src;
    // Normally we can just use dispatchSetReveal, but the value has to be
    // changed immediately before reload.
    this.modelViewer.reveal = 'interaction';
    // Force reload the model
    this.modelViewer.src = '';
    this.modelViewer.src = src;
  }
}

declare global {
  interface PosterControlsElement {
    'me-poster-controls': PosterControlsElement;
  }
}
