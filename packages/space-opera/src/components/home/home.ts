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

import '@material/mwc-tab';
import '@material/mwc-radio';
import '@material/mwc-formfield';
import '../shared/expandable_content/expandable_tab.js';
import '../shared/pill_buttons/pill_buttons.js'

import {customElement, html, internalProperty, property} from 'lit-element';

import {homeStyles} from '../../styles.css.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';

import {CARD_CONTENT, CardContentInterface, THEMES} from './types.js';

/**
 * Home Container Card
 */
@customElement('home-container-card')
export class HomeContainerCard extends ConnectedLitElement {
  static styles = homeStyles;
  @property({type: Object}) content: CardContentInterface = {};
  @property({type: String}) theme: string = '';

  render() {
    const icon = this.theme === 'light' ? this.content.iconForLight :
                                          this.content.iconForDark;
    return html`
      <div class="CardContainer">
        <div class="CardContent">
          <img src=${icon}>
        </div>
        <div class="CardContent text">
          <div class="HomeCardHeader">${this.content.header}</div> 
          <div class="HomeCardContent">${this.content.body}</div>
        </div>
      </div>
    `;
  }
}

/**
 * Home Container
 */
@customElement('home-container')
export class HomeContainer extends ConnectedLitElement {
  static styles = homeStyles;
  @internalProperty() theme: 'light'|'dark' = 'dark';

  setTheme() {
    const theme = THEMES[this.theme];
    const root = document.documentElement;
    root.style.setProperty('--card-background-color', theme.cardBackground);
    root.style.setProperty('--card-border-color', theme.cardBorder)
    root.style.setProperty(
        '--expandable-section-text', theme.expandableSectionText)
    root.style.setProperty(
        '--expandable-section-header-background',
        theme.expandableSectionHeaderBackground);
    root.style.setProperty(
        '--expandable-section-header-hover',
        theme.expandableSectionHeaderHover);
    root.style.setProperty(
        '--text-on-expandable-background', theme.textOnExpandableBackground);
    root.style.setProperty(
        '--expandable-section-background', theme.expandableSectionBackground);
    root.style.setProperty(
        '--secondary-text-on-expandable-background',
        theme.secondaryTextOnExpandbleBackground)
    root.style.setProperty('--dropdown-background', theme.dropdownBackground);
    root.style.setProperty(
        '--number-input-background', theme.numberInputBackground);
  }

  enableDarkTheme() {
    this.theme = 'dark';
    this.setTheme();
  }

  enableLightTheme() {
    this.theme = 'light';
    this.setTheme();
  }

  render() {
    return html`
      <me-expandable-tab tabName="Home" .open=${true} .sticky=${true}>
        <div slot="content">
          <div class="note">
            Welcome to the model viewer editor where you can generate &lt;model-viewer&gt; HTML snippets, as well as edit GLBs.
          </div>
          <a href="https://policies.google.com/privacy" style="color: var(--text-on-expandable-background);">Privacy</a>
        </div>
      </me-expandable-tab>
      <me-expandable-tab tabName="Modules" .open=${true}>
        <div slot="content">
          <me-card title="File Manager">
            <div slot="content">
              <home-container-card .content=${CARD_CONTENT.save} 
                theme=${this.theme}>
              </home-container-card>
            </div>
          </me-card>
          <me-card title="&lt;model-viewer&gt; snippet">
            <div slot="content">
              <home-container-card .content=${CARD_CONTENT.edit} 
                theme=${this.theme}>
              </home-container-card>
              <home-container-card .content=${CARD_CONTENT.camera} 
                theme=${this.theme}>
              </home-container-card>
            </div>
          </me-card>
          <me-card title="GLB Model">
            <div slot="content">
              <home-container-card .content=${CARD_CONTENT.materials}
                theme=${this.theme}>
              </home-container-card>
              <home-container-card .content=${CARD_CONTENT.inspector}
                theme=${this.theme}>
              </home-container-card>
            </div>
          </me-card>
        </div>
      </me-expandable-tab>
      <me-expandable-tab tabName="Editor Settings" .open=${true}>
        <div slot="content">
          <me-card title="Color Themes">
            <div slot="content">
              <mwc-formfield label="Dark Theme">
                <mwc-radio name="location" checked 
                  @click=${this.enableDarkTheme}>
                </mwc-radio>
              </mwc-formfield>
              <mwc-formfield label="Light Theme">
                <mwc-radio name="location" 
                  @click=${this.enableLightTheme}>
                </mwc-radio>
              </mwc-formfield>
            </div>
          </me-card>
        </div>
      </me-expandable-tab>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'home-container': HomeContainer;
    'home-container-card': HomeContainerCard;
  }
}
