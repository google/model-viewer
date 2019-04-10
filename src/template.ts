/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import ControlsPrompt from './assets/controls-svg.js';
import ARGlyph from './assets/view-in-ar-material-svg.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      contain: strict;
      width: 300px;
      height: 150px;
    }

    .container {
      position: relative;
    }


    a.enter-ar {
      width: 40px;
      height: 40px;
      position: absolute;
      display: block;
      right: 10px;
      top: 10px;
      display: none;
    }

    a.enter-ar svg {
      position: absolute;
      top: calc(50% - 12px);
      left: calc(50% - 12px);
    }

    a.enter-ar .disc {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      opacity: 0.6;
      background-color: #fff;
      box-shadow: 0px 0px 1px 0px rgba(0,0,0,0.2);
    }

    canvas {
      width: 100%;
      height: 100%;
      display: none;
    }

    canvas.show {
      display: block;
    }

    .slot {
      position: absolute;
      top: 0;
      left: 0;
    }

    .slot.poster {
      opacity: 0;
      transition: opacity 0.3s;
    }

    .slot.poster.show {
      opacity: 1;
      transition: none;
    }

    .slot.poster:not(.show) {
      pointer-events: none;
    }

    #default-poster {
      width: 100%;
      height: 100%;
      position: absolute;
      background-size: cover;
      background-position: center;
    }

    .slot.controls-prompt {
      display: flex;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transform-origin: center center;
      transform: scale(0.9);
      transition: transform 0.3s, opacity 0.3s;
    }

    .slot.controls-prompt svg {
      transform: scale(0.5);
    }

    .slot.controls-prompt.visible {
      opacity: 1;
      transform: scale(1);
    }
  </style>
  <div class="container">
    <div class="slot poster">
      <slot name="poster">
        <div id="default-poster" aria-hidden="true" aria-label="Activate to view in 3D!"></div>
      </slot>
    </div>
    <a tabindex="2"
        class="enter-ar"
        href="#"
        aria-label="View this 3D model in augmented reality">
      <div class="disc"></div>
      ${ARGlyph}
    </a>
    <canvas tabindex="1"
        aria-label="A depiction of a 3D model"
        aria-live="polite">
    </canvas>
    <!-- NOTE(cdata): We need to wrap slots because browsers without ShadowDOM
         will have their <slot> elements removed by ShadyCSS -->
    <div class="slot controls-prompt">
      <slot name="controls-prompt" aria-hidden="true">
        ${ControlsPrompt}
      </slot>
    </div>
  </div>
  <slot></slot>
`;

export default template;

export const makeTemplate = (tagName: string) => {
  const clone = document.createElement('template');
  clone.innerHTML = template.innerHTML;
  if ((window as any).ShadyCSS) {
    (window as any).ShadyCSS.prepareTemplate(clone, tagName);
  }
  return clone;
};
