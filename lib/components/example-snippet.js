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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import 'prismjs';
import { property } from 'lit/decorators.js';
import { ReactiveElement } from 'lit';
const EMPTY_ATTRIBUTE_RE = /([\w-]+)=\"\"/g;
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
    constructor() {
        super(...arguments);
        this.useShadowRoot = false;
        this.stampTo = null;
        this.template = null;
        this.highlightAs = 'markup';
        this.lazy = false;
        this.preserveWhitespace = false;
        this.inertScript = false;
        this.stamped = false;
    }
    stamp() {
        if (this.template == null) {
            return;
        }
        const root = this.getRootNode();
        const stampTarget = this.stampTo == null ?
            this :
            root.getElementById(this.stampTo);
        if (stampTarget != null) {
            let parentNode;
            if (this.useShadowRoot) {
                if (stampTarget.shadowRoot == null) {
                    stampTarget.attachShadow({ mode: 'open' });
                }
                parentNode = stampTarget.shadowRoot;
            }
            else {
                parentNode = stampTarget;
            }
            const { template, highlightAs } = this;
            const content = template.content.cloneNode(true);
            if (this.inertScript) {
                const scripts = Array.from(content.querySelectorAll('script'));
                for (const script of scripts) {
                    script.parentNode.removeChild(script);
                }
            }
            parentNode.appendChild(content);
            const pre = document.createElement('pre');
            const code = document.createElement('code');
            pre.appendChild(code);
            let snippet = template.innerHTML;
            snippet = snippet.replace(/type="noexecute" /g, '');
            snippet = snippet.replace(/-noexecute/g, '');
            if (!this.preserveWhitespace) {
                snippet = snippet.trim();
            }
            if (highlightAs === 'html') {
                snippet = snippet.replace(EMPTY_ATTRIBUTE_RE, '$1');
            }
            const highlighted = Prism.highlight(snippet, Prism.languages[highlightAs], highlightAs);
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
    updated(changedProperties) {
        super.updated(changedProperties);
        if (!this.stamped && !this.lazy &&
            (changedProperties.has('stamp-to') ||
                changedProperties.has('template')) &&
            this.template != null) {
            this.stamp();
        }
    }
}
__decorate([
    property({ type: Boolean, attribute: 'use-shadow-root' })
], ExampleSnippet.prototype, "useShadowRoot", void 0);
__decorate([
    property({ type: String, attribute: 'stamp-to' })
], ExampleSnippet.prototype, "stampTo", void 0);
__decorate([
    property({ type: Object })
], ExampleSnippet.prototype, "template", void 0);
__decorate([
    property({ type: String, attribute: 'highlight-as' })
], ExampleSnippet.prototype, "highlightAs", void 0);
__decorate([
    property({ type: Boolean, attribute: 'lazy' })
], ExampleSnippet.prototype, "lazy", void 0);
__decorate([
    property({ type: Boolean })
], ExampleSnippet.prototype, "preserveWhitespace", void 0);
__decorate([
    property({ type: Boolean, attribute: 'inert-script' })
], ExampleSnippet.prototype, "inertScript", void 0);
customElements.define('example-snippet', ExampleSnippet);
//# sourceMappingURL=example-snippet.js.map