/**
 * @license
 * Copyright 2022 Google LLC. All Rights Reserved.
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
import 'js-beautify/js/lib/beautify-html.js';
import 'js-beautify/js/lib/beautify-css.js';
import { SnippetViewer } from '../../components/shared/snippet_viewer/snippet_viewer.js';
import { html } from 'lit';

describe('snippet viewer test', () => {
  let snippetViewer: SnippetViewer;

  beforeEach(async () => {
    snippetViewer = new SnippetViewer();
    document.body.appendChild(snippetViewer);
    await snippetViewer.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(snippetViewer);
  });

  it('formatted HTML strips Lit comments', async () => {
    // clang-format off

    // Pulled from real DOM of astronaut example.
    snippetViewer.renderedSnippet = html`<!--?lit$343342268$--><model-viewer bounds="tight" enable-pan="" src="Astronaut.glb" ar="" ar-modes="webxr scene-viewer quick-look" camera-controls="" environment-image="neutral" poster="poster.webp" shadow-intensity="1" ar-status="not-presenting">
    <!--?lit$128424273$--><!---->
<div class="progress-bar hide" slot="progress-bar">
<div class="update-bar"></div>
</div><!----><!---->
<button slot="ar-button" id="ar-button">
View in your space
</button><!----><!---->
<div id="ar-prompt">
<img>
</div><!---->
    </model-viewer>`;
    // clang-format on

    const goldenFormattedHTML = `<model-viewer bounds="tight" enable-pan src="Astronaut.glb" ar ar-modes="webxr scene-viewer quick-look" camera-controls environment-image="neutral" poster="poster.webp" shadow-intensity="1">
    <div class="progress-bar hide" slot="progress-bar">
        <div class="update-bar"></div>
    </div>
    <button slot="ar-button" id="ar-button">
        View in your space
    </button>
    <div id="ar-prompt">
        <img>
    </div>
</model-viewer>`;

    await snippetViewer.updateComplete;
    expect(snippetViewer.formattedHtml).toBe(goldenFormattedHTML);
  });

  it('formatted HTML does not greedily strip comments', async () => {
    // clang-format off

    // Pulled from real DOM of astronaut example with a hotspot.
    // hotspot <button> is beteen two comments on the same line
    snippetViewer.renderedSnippet = html`<!--?lit$128424273$--><model-viewer bounds="tight" enable-pan="" src="Astronaut.glb" ar="" ar-modes="webxr scene-viewer quick-look" camera-controls="" environment-image="neutral" poster="poster.webp" shadow-intensity="1" ar-status="not-presenting">
    <!--?lit$128424273$--><!----><button class="Hotspot" slot="hotspot-1" data-position="-0.043973778464142396m 1.2075171453793048m 0.29653766978435936m" data-normal="-0.4260645307016329m -0.06968452861538316m 0.9020050344369756m" data-visibility-attribute="visible"><div class="HotspotAnnotation">asdf</div></button><!----><!---->
<div class="progress-bar hide" slot="progress-bar">
<div class="update-bar"></div>
</div><!----><!---->
<button slot="ar-button" id="ar-button">
View in your space
</button><!----><!---->
<div id="ar-prompt">
<img>
</div><!---->
    </model-viewer>`;
    // clang-format on

    const goldenFormattedHTML = `<model-viewer bounds="tight" enable-pan src="Astronaut.glb" ar ar-modes="webxr scene-viewer quick-look" camera-controls environment-image="neutral" poster="poster.webp" shadow-intensity="1">
    <button class="Hotspot" slot="hotspot-1" data-position="-0.043973778464142396m 1.2075171453793048m 0.29653766978435936m" data-normal="-0.4260645307016329m -0.06968452861538316m 0.9020050344369756m" data-visibility-attribute="visible">
        <div class="HotspotAnnotation">asdf</div>
    </button>
    <div class="progress-bar hide" slot="progress-bar">
        <div class="update-bar"></div>
    </div>
    <button slot="ar-button" id="ar-button">
        View in your space
    </button>
    <div id="ar-prompt">
        <img>
    </div>
</model-viewer>`;

    await snippetViewer.updateComplete;
    expect(snippetViewer.formattedHtml).toBe(goldenFormattedHTML);
  });
});
