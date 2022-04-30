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
export const styles: CSSResult = css`.Hotspot {
  background: #fff;
  border-radius: 32px;
  border: 0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
  cursor: pointer;
  height: 24px;
  padding: 8px;
  position: relative;
  transition: opacity 0.3s;
  width: 24px;
}

.Hotspot:not([data-visible]) {
  background: transparent;
  border: 4px solid #fff;
  box-shadow: none;
  height: 32px;
  pointer-events: none;
  width: 32px;
}

.Hotspot:focus {
  border: 4px solid rgb(0, 128, 200);
  height: 32px;
  outline: none;
  width: 32px;
}

.Hotspot > * {
  opacity: 1;
  transform: translateY(-50%);
}

.HotspotAnnotation{
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
  color: rgba(0, 0, 0, 0.8);
  display: block;
  font-family: Futura, Helvetica Neue, sans-serif;
  font-size: 18px;
  font-weight: 700;
  left: calc(100% + 1em);
  max-width: 128px;
  overflow-wrap: break-word;
  padding: 0.5em 1em;
  position: absolute;
  top: 50%;
  width: max-content;
}

.Hotspot:not([data-visible]) > * {
  opacity: 0;
  pointer-events: none;
  transform: translateY(calc(-50% + 4px));
  transition: transform 0.3s, opacity 0.3s;
}
`;
