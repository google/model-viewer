/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import 'prismjs';

import {property} from 'lit/decorators.js';
import {ReactiveElement} from 'lit';

// Silence tsc since prismjs isn't a proper module
declare var Prism: any;

const EMPTY_ATTRIBUTE_RE = /([\w-]+)=\"\"/g;

export type RootNode = Document|ShadowRoot;

/**
 * ExampleSnippet is a custom element that enables documentation authors to
 * craft a single code snippet that is used for both human-readable
 * documentation and running a live demo.
 *
 * An example usage looks like this:
 *
 * <div id="demo-container"></div>
 * <example-snippet stamp-to="demo-container" highlight-as="html">
 *   <template>
 * <script>
 *   console.log('This is how you log things to the console!');
 * </script>
 *   </template>
 * </example-snippet>
 *
 * The above example will create a <pre><code></code></pre> inside of itself
 * containing syntax-highlightable markup of the code in the template. It will
 * also create the content of the template as DOM and insert it into the node
 * indicated by the "stamp-to" attribute. The "stamp-to" attribute references
 * another node by its ID.
 *
 * Add the "lazy" boolean attribute if you want to stamp the example manually
 * by invoking its "stamp" method. Note that this will prevent the snippet from
 * stamping itself automatically upon being connected to the DOM.
 *
 * ExampleSnippet is a simplified alternative to Polymer Project's DemoSnippet.
 * The key differences are:
 *
 *  - ExampleSnippet does not use ShadowDOM by default
 *  - ExampleSnippet supports stamping demos to elements other than itself
 *
 * @see https://github.com/PolymerElements/iron-demo-helpers/blob/master/demo-snippet.js
 */
export class ExampleSnippet extends ReactiveElement {
  @property({type: Boolean, attribute: 'use-shadow-root'})
  useShadowRoot: boolean = false;
  @property({type: String, attribute: 'stamp-to'}) stampTo: string|null = null;
  @property({type: Object}) template: HTMLTemplateElement|null = null;
  @property({type: String, attribute: 'highlight-as'})
  highlightAs: string = 'markup';
  @property({type: Boolean, attribute: 'lazy'}) lazy: boolean = false;
  @property({type: Boolean}) preserveWhitespace: boolean = false;
  @property({type: Boolean, attribute: 'inert-script'})
  inertScript: boolean = false;

  readonly stamped: boolean = false;

  public stamp() {
    if (this.template == null) {
      return;
    }

    const root = this.getRootNode()!;
    const stampTarget = this.stampTo == null ?
        this :
        (root as RootNode).getElementById(this.stampTo);

    if (stampTarget != null) {
      let parentNode;

      if (this.useShadowRoot) {
        if (stampTarget.shadowRoot == null) {
          stampTarget.attachShadow({mode: 'open'});
        }

        parentNode = stampTarget.shadowRoot!;
      } else {
        parentNode = stampTarget;
      }

      const {template, highlightAs} = this;
      const content = template.content.cloneNode(true) as DocumentFragment;

      if (this.inertScript) {
        const scripts = Array.from(content.querySelectorAll('script'));
        for (const script of scripts) {
          script.parentNode!.removeChild(script);
        }
      }

      parentNode.appendChild(content);

      const pre = document.createElement('pre');
      const code = document.createElement('code');

      pre.appendChild(code);

      let snippet = template.innerHTML;

      snippet = snippet.replace('type="noexecute" ', '');

      if (!this.preserveWhitespace) {
        snippet = snippet.trim();
      }

      if (highlightAs === 'html') {
        snippet = snippet.replace(EMPTY_ATTRIBUTE_RE, '$1');
      }

      const highlighted =
          Prism.highlight(snippet, Prism.languages[highlightAs], highlightAs);

      code.innerHTML = highlighted;

      this.appendChild(pre);
    }
  }

  connectedCallback() {
    super.connectedCallback && super.connectedCallback();
    this.template = this.querySelector('template');
  }

  createRenderRoot() {
    return this;
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (!this.stamped && !this.lazy &&
        (changedProperties.has('stamp-to') ||
         changedProperties.has('template')) &&
        this.template != null) {
      this.stamp();
    }
  }
}

customElements.define('example-snippet', ExampleSnippet);
