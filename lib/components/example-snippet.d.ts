import 'prismjs';
import { ReactiveElement } from 'lit';
export type RootNode = Document | ShadowRoot;
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
export declare class ExampleSnippet extends ReactiveElement {
    useShadowRoot: boolean;
    stampTo: string | null;
    template: HTMLTemplateElement | null;
    highlightAs: string;
    lazy: boolean;
    preserveWhitespace: boolean;
    inertScript: boolean;
    readonly stamped: boolean;
    stamp(): void;
    connectedCallback(): void;
    createRenderRoot(): this;
    updated(changedProperties: Map<string, any>): void;
}
