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
 * istributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */


import {css, CSSResult} from 'lit-element';
export const styles: CSSResult = css`.Hotspot {
  position: relative;
  background: #fff;
  border-radius: 32px;
  box-sizing: border-box;
  border: 0;
  transition: opacity 0.3s;
  width: 24px;
  height: 24px;
  padding: 8px;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
}

.Hotspot:not([data-visible]) {
  background: transparent;
  border: 4px solid #fff;
  width: 32px;
  height: 32px;
  box-shadow: none;
  pointer-events: none;
}

.Hotspot:focus {
  border: 4px solid rgb(0, 128, 200);
  width: 32px;
  height: 32px;
  outline: none;
}

.Hotspot > * {
  transform: translateY(-50%);
  opacity: 1;
}

.HotspotAnnotation{
  display: block;
  position: absolute;
  font-family: Futura, Helvetica Neue, sans-serif;
  color: rgba(0, 0, 0, 0.8);
  font-weight: 700;
  font-size: 18px;
  max-width: 128px;
  padding: 0.5em 1em;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  left: calc(100% + 1em);
  top: 50%;
}

.Hotspot:not([data-visible]) > * {
  pointer-events: none;
  opacity: 0;
  transform: translateY(calc(-50% + 4px));
  transition: transform 0.3s, opacity 0.3s;
}
`;
