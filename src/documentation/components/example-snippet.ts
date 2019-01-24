import 'prismjs';

import {property} from '@polymer/lit-element';
import {UpdatingElement} from '@polymer/lit-element/lib/updating-element.js';

// Silence tsc since prismjs isn't a proper module
declare var Prism: any;

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
 * ExampleSnippet is a simplified alternative to Polymer Project's DemoSnippet.
 * The key differences are:
 *
 *  - ExampleSnippet does not use ShadowDOM by default
 *  - ExampleSnippet supports stamping demos to elements other than itself
 *
 * @see https://github.com/PolymerElements/iron-demo-helpers/blob/master/demo-snippet.js
 */
export class ExampleSnippet extends UpdatingElement {
  @property({type: Boolean, attribute: 'use-shadow-root'})
  useShadowRoot: boolean = false;
  @property({type: String, attribute: 'stamp-to'}) stampTo: string|null = null;
  @property({type: Object}) template: HTMLTemplateElement|null = null;
  @property({type: String, attribute: 'highlight-as'})
  highlightAs: string = 'markup';
  @property({type: Boolean}) preserveWhitespace: boolean = false;

  readonly stamped: boolean = false;

  protected stamp() {
    if (this.stampTo == null || this.template == null) {
      return;
    }

    const root = this.getRootNode()!;
    const stampTarget = (root as RootNode).getElementById(this.stampTo);

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
      const content = template.content.cloneNode(true);

      parentNode.appendChild(content);

      const pre = document.createElement('pre');
      const code = document.createElement('code');

      pre.appendChild(code);

      const snippet = this.preserveWhitespace ? template.innerHTML :
                                                template.innerHTML.trim();
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

    if (!this.stamped &&
        (changedProperties.has('stamp-to') ||
         changedProperties.has('template')) &&
        this.template != null && this.stampTo != null) {
      this.stamp();
    }
  }
}

customElements.define('example-snippet', ExampleSnippet);
