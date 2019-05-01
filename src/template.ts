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

import CloseIcon from './assets/close-material-svg.js';
import ControlsPrompt from './assets/controls-svg.js';
import ARGlyph from './assets/view-in-ar-material-svg.js';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      position: relative;
      contain: strict;
      width: 300px;
      height: 150px;
    }

    .container {
      position: relative;
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
      pointer-events: none;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .slot > * {
      pointer-events: initial;
    }

    .slot.poster {
      opacity: 0;
      transition: opacity 0.3s 0.3s;
    }

    .slot.poster.show {
      opacity: 1;
      transition: none;
    }

    .slot.poster > * {
      pointer-events: initial;
    }

    .slot.poster:not(.show) > * {
      pointer-events: none;
    }

    #default-poster {
      width: 100%;
      height: 100%;
      position: absolute;
      background-size: cover;
      background-position: center;
      background-color: var(--poster-color, #fff);
      background-image: var(--poster-image, none);
    }

    #default-progress-bar {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    }

    #default-progress-bar > .mask {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: var(--progress-mask, #fff);
      transition: opacity 0.3s;
      opacity: 0.2;
    }

    #default-progress-bar > .bar {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 5px;
      transition: transform 0.09s;
      transform-origin: top left;
      transform: scaleX(0);
      overflow: hidden;
    }

    #default-progress-bar > .bar:before {
      content: '';
      display: block;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;

      background-color: var(--progress-bar-color, rgba(0, 0, 0, 0.4));

      transition: none;
      transform-origin: top left;
      transform: translateY(0);
    }

    #default-progress-bar > .bar.hide:before {
      transition: transform 0.3s 1s;
      transform: translateY(-100%);
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

    .slot.controls-prompt > * {
      pointer-events: none;
    }

    .slot.controls-prompt svg {
      transform: scale(0.5);
    }

    .slot.controls-prompt.visible {
      opacity: 1;
      transform: scale(1);
    }

    .slot.ar-button {
      -moz-user-select: none;
      -webkit-tap-highlight-color: transparent;
      user-select: none;
    }

    .slot.ar-button:not(.enabled),
    .fullscreen .slot.ar-button {
      display: none;
    }

    .fab {
      display: flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: 40px;
      height: 40px;
      cursor: pointer;
      background-color: #fff;
      box-shadow: 0px 0px 4px rgba(0, 0, 0, 0.15);
      border-radius: 100px;
    }

    .fab > * {
      opacity: 0.87;
    }

    #default-ar-button {
      position: absolute;
      bottom: 16px;
      right: 16px;
    }

    :not(.fullscreen) .slot.exit-fullscreen-button {
      display: none;
    }

    #default-exit-fullscreen-button {
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 16px;
      left: 16px;
      width: 40px;
      height: 40px;
      box-sizing: border-box;
    }

    #default-exit-fullscreen-button > svg {
      fill: #fff;
    }
  </style>
  <div class="container">
    <canvas tabindex="1"
      aria-label="A depiction of a 3D model"
      aria-live="polite">
    </canvas>

    <!-- NOTE(cdata): We need to wrap slots because browsers without ShadowDOM
         will have their <slot> elements removed by ShadyCSS -->
    <div class="slot poster">
      <slot name="poster">
        <div id="default-poster" aria-hidden="true" aria-label="Activate to view in 3D!"></div>
      </slot>
    </div>

    <div class="slot progress-bar">
      <slot name="progress-bar">
        <div id="default-progress-bar" aria-hidden="true">
          <div class="mask"></div>
          <div class="bar"></div>
        </div>
      </slot>
    </div>

    <div class="slot ar-button">
      <slot name="ar-button">
        <a id="default-ar-button" class="fab" href="#"
            tabindex="2"
            aria-label="View this 3D model up close">
          ${ARGlyph}
        </a>
      </slot>
    </div>

    <div class="slot exit-fullscreen-button">
      <slot name="exit-fullscreen-button">
        <a id="default-exit-fullscreen-button"
            tabindex="3"
            aria-label="Exit fullscreen"
            aria-hidden="true">
          ${CloseIcon}
        </a>
      </slot>
    </div>

    <div class="slot controls-prompt">
      <slot name="controls-prompt" aria-hidden="true">
        ${ControlsPrompt}
      </slot>
    </div>

    <div class="slot default">
      <slot></slot>
    </div>
  </div>`;

export default template;

export const makeTemplate = (tagName: string) => {
  const clone = document.createElement('template');
  clone.innerHTML = template.innerHTML;
  if ((window as any).ShadyCSS) {
    (window as any).ShadyCSS.prepareTemplate(clone, tagName);
  }
  return clone;
};
