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

import ARKitSVG from './assets/arkit-glyph.svg';

const CLICK_TO_VIEW_TEXT = 'Select to view 3D content.';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    .container {
      position: relative;
    }
    .poster {
      width: 100%;
      height: 100%;
      position: absolute;
      display: none;
    }
    .poster.show {
      display: block;
    }

    .click-to-view {
      display: none;
      position: absolute;
      z-index: 9999;
      width: 100%;
      margin: 0 auto;
      bottom: 20px;
      background-color: rgba(0, 0, 0, 0.2);
      color: white;
      font-size: 120%;
    }
    .click-to-view.show {
      display: block;
    }

    a.enter-ar {
      width: 75px;
      height: 75px;
      position: absolute;
      display: block;
      right: 20px;
      top: 20px;
      display: none;
    }
    a.enter-ar svg {
      position: absolute;
      top: 0;
      left: 0;
    }
    a.enter-ar .disc {
      width: 100%;
      height: 100%;
      border-radius: 50%;
      opacity: 0.6;
      background-color: #fff;
      box-shadow: 0px 0px 1px 0px rgba(0,0,0,0.2);
      position: absolute;
      top: 0;
      left: 0;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: none;
    }
    canvas.show {
      display: block;
    }
  </style>
  <div class="container">
    <a class="enter-ar" href="#">
      <div class="disc"></div>
      ${ARKitSVG}
    </a>
    <div class="click-to-view">${CLICK_TO_VIEW_TEXT}</div>
    <img class="poster"/>
    <canvas></canvas>
  </div>
  <slot></slot>
`;

export default template;
