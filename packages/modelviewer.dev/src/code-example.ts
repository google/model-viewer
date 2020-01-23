import 'prismjs';

import {FocusVisiblePolyfillMixin} from '@google/model-viewer/lib/utilities/focus-visible.js';
import {css, customElement, html, LitElement, property} from 'lit-element';
import {directive, Part} from 'lit-html';

declare var Prism: any;


const rawNode =
    directive((node: Node|null) => (part: Part) => part.setValue(node || ''));

const $codeElement = Symbol('codeElement');
const $alt = Symbol('alt');
const $exampleTextElement = Symbol('exampleTextElement');

@customElement('code-example')
export class CodeExample extends FocusVisiblePolyfillMixin
(LitElement) {
  static get styles() {
    return css`
:host {
  display: block;
  background-color: var(--color-light-yellow);
  font-size: var(--body-font-size);
  box-shadow: var(--shadow);
  border: 1px solid var(--color-yellow);
  overflow: auto;
  cursor: text;
}

code {
  font-family: var(--font-family-monospace, monospace);
  font-size: 0.85em;
}

/* NOTE: This ruleset is our integration surface area with the
 * :focus-visible polyfill.
 *
 * @see https://github.com/WICG/focus-visible/pull/196 */
:host([data-js-focus-visible]:focus:not(.focus-visible)),
:host([data-js-focus-visible]) :focus:not(.focus-visible) {
  outline: none;
}

pre {
  margin: 0;
  padding: 1em;
  line-height: 1.33rem;
  white-space: pre-wrap;
}

/* prism.js */
/* prism */
.token.tag,
.token.keyword,
.token.namespace {
  color: hsl(0, 100%, 50%);
}

.token.selector,
.token.property,
.token.string,
.token.attr-name {
  color: hsl(200, 100%, 35%);
}

.token.function,
.token.attr-value {
  color: hsl(140, 100%, 25%);
}

.language-javascript,
.language-css {
  color: #757575;
}

.token.comment,
.content code[class*="language-"],
.content pre[class*="language-"] {
  color: #999;
}`;
  }

  @property({attribute: 'language', type: String}) language: string = 'html';
  @property({type: Object})
  protected[$exampleTextElement]: HTMLElement|null = null;

  @property({attribute: 'alt', type: String}) alt: string = '';

  @property({type: String, attribute: 'stamp-to'}) stampTo: string|null = null;

  connectedCallback() {
    super.connectedCallback();

    const script = this.querySelector('script');
    if (script && script.type === 'example' && script.parentNode === this) {
      this[$exampleTextElement] = script;
    }
  }

  createRenderRoot() {
    this.attachShadow({mode: 'open', delegatesFocus: true});
    return this.shadowRoot!;
  }

  get exampleText() {
    if (this[$exampleTextElement] && this[$exampleTextElement]!.textContent) {
      return this[$exampleTextElement]!.textContent!.trim().replace(
          /<\\\/script>/gi, '</script>');
    }
    return '';
  }

  protected get[$codeElement]() {
    const code = document.createElement('code');
    const {exampleText, language} = this;

    const highlightedExampleHTML =
        Prism.highlight(exampleText, Prism.languages[language], language);

    code.innerHTML = highlightedExampleHTML;

    return code;
  }

  protected get[$alt]() {
    const {language, exampleText} = this;

    if (exampleText) {
      return `${language} example`;
    }

    return `Empty ${language} example`;
  }

  updated(changedProperties: Map<string|symbol, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('alt') && this.alt === '') {
      this.alt = this[$alt];
    }

    if ((changedProperties.has('stampTo') ||
         changedProperties.has($exampleTextElement)) &&
        this.stampTo != null && this[$exampleTextElement] != null) {
      const root = this.getRootNode() as Document | ShadowRoot;
      const stampTarget = root.querySelector(this.stampTo);

      console.log(stampTarget);
      if (stampTarget != null) {
        const template = document.createElement('template');
        template.innerHTML = this.exampleText;
        stampTarget.appendChild(template.content.cloneNode(true));
      }
    }
  }

  render() {
    return html`<pre tabindex="1" aria-label="${this.alt}">${
        rawNode(this[$codeElement])}</pre>`;
  }
}

/*

import 'prismjs';

import {property} from 'lit-element';
import {UpdatingElement} from 'lit-element/lib/updating-element.js';

// Silence tsc since prismjs isn't a proper module
declare var Prism: any;

const EMPTY_ATTRIBUTE_RE = /([\w-]+)=\"\"/g;

export type RootNode = Document|ShadowRoot;

export class ExampleSnippet extends UpdatingElement {
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
        this.template != null && this.stampTo != null) {
      this.stamp();
    }
  }
}

customElements.define('example-snippet', ExampleSnippet);

*/