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

import '@material/mwc-button';
declare function html_beautify(html: string): string;
declare function css_beautify(css: string): string;
import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';
import {TemplateResult} from 'lit';

/**
 * Displays the inner text of an arbitrary TemplateResult.
 */
@customElement('snippet-viewer')
export class SnippetViewer extends LitElement {
  static get styles() {
    return css`
      textarea#snippet {
        width: 100%;
      }
    `;
  }

  @property({type: Object}) renderedSnippet: TemplateResult = html``;
  @property({type: String}) renderedStyle = '';
  @property({type: Boolean}) isReadOnly?: Boolean = true;
  @query('span#tag') shadowTag!: HTMLElement;
  @query('textarea#snippet') snippet!: HTMLTextAreaElement;

  getText() {
    return this.snippet.value;
  }

  copyToClipboard() {
    this.snippet.select();
    document.execCommand('copy');
  }

  protected render() {
    if (this.isReadOnly === false) {
      return html`<span id="tag" style='display: none'>${
          this.renderedSnippet}</span>
      <textarea id="snippet" rows=15></textarea>`
    }
    return html`
      <span id="tag" style='display: none'>${this.renderedSnippet}</span>
      <textarea id="snippet" readonly rows=10></textarea>
`;
  }

  protected updated() {
    this.snippet.textContent = this.formattedHtml + '\n' + this.formattedStyle;
    this.snippet.value = this.formattedHtml + '\n' + this.formattedStyle;
  }

  get formattedStyle() {
    return this.renderedStyle ? `<style>
${css_beautify(this.renderedStyle)}
</style>
` :
                                ``;
  }

  get formattedHtml() {
    // Removes LitElement render artifacts e.g. <!--?lit$515089429$-->
    // the `?` in `.*?` is a non-greedy match.
    let html = this.shadowTag.innerHTML.replace(/<!--.*?-->/g, '');
    // Removes empty lines that may result from the previous line
    html = html.replace(/\n\s*\n/g, '');
    // Remove the ar-status runtime-added tag
    html = html.replace(/ar-status="[\w- ]+" */, '');
    // Remove redundant ="" for boolean attribs
    html = html.replace(/=""/g, '');
    return html_beautify(html);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'snippet-viewer': SnippetViewer;
  }
}
