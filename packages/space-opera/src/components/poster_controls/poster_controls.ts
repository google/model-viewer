import '../shared/expandable_content/expandable_tab.js';
import '@material/mwc-button';

import {customElement, html, internalProperty} from 'lit-element';

import {dispatchSetDisplayPoster, dispatchSetPosterTrigger} from '../../redux/poster_dispatcher.js';
import {State} from '../../redux/space_opera_base.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';

import {styles} from './poster_controls.css';

/** Allow users to create / display a poster. */
@customElement('me-poster-controls')
export class PosterControlsElement extends ConnectedLitElement {
  static styles = styles;

  @internalProperty() poster?: string;

  stateChanged(state: State) {
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

  onCreatePoster() {
    dispatchSetPosterTrigger(true);
  }

  onDisplayPoster() {
    dispatchSetDisplayPoster(true);
  }
}

declare global {
  interface PosterControlsElement {
    'me-poster-controls': PosterControlsElement;
  }
}
