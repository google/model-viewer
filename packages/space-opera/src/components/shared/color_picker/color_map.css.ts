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


import {css, CSSResult} from 'lit';
export const styles: CSSResult = css`:host {
  height: 150px;
  width: 200px;
  position: relative;
  display: block;
  --thumb-size: 12px;
}

.ColorMapContainer {
  height: 100%;
}

.El {
  position: relative;
  min-width: 100px;
  min-height: 100px;
  touch-action: none; /* prevents touch events causing page scroll. */
}

.ColorPointer {
  position: absolute;
  box-sizing: border-box;
  width: 12px;
  height: 12px;
  top: 50%;
  left: 50%;
  border-radius: 50%;
  margin: -6px 0 0 -6px;
  z-index: 2;
}

.LargeSwatches .ColorMap .ColorPointer {
  width: 20px;
  height: 20px;
}

.ColorMapBackground {
  position: absolute;
  top: 0;
  width: 100%;
  height: 100%;
  left: 0;
}

.WhiteToTransparentBackground {
  background: linear-gradient(to right, #fff 0%, rgba(255,255,255,0) 100%);
  z-index: 0;
}

.WhiteToBlackBackground {
  background: linear-gradient(to bottom, transparent 0%, #000 100%);
  z-index: 1;
}

.Outer {
  border: 2px solid rgba(255, 255, 255, .8);
  box-sizing: border-box;
  border-radius: 100%;
  width: 12px;
  height: 12px;
  position: absolute;
}

.Ink {
  border-radius: 100%;
  height: var(--thumb-size);
  left: 0;
  opacity: 0;
  position: absolute;
  width: var(--thumb-size);
}

`;
