/**
 * @license
 * Copyright 2021 Google LLC. All Rights Reserved.
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

export const modelViewerStyles: CSSResult = css`:not(:defined) > * {
  display: none;
}

body {
  margin: 0;
  padding: 0;
  width: 100vw;
  height: 100vh;
}

model-viewer {
  width: 100%;
  height: 90%;
  background-color: #ffffff;
}
`;

export const progressBarCSS: CSSResult = css`
.progress-bar {
  display: block;
  width: 33%;
  height: 10%;
  max-height: 2%;
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate3d(-50%, -50%, 0);
  border-radius: 25px;
  box-shadow: 0px 3px 10px 3px rgba(0, 0, 0, 0.5), 0px 0px 5px 1px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.9);
  background-color: rgba(0, 0, 0, 0.5);
}

.progress-bar.hide {
  visibility: hidden;
  transition: visibility 0.3s;
}

.update-bar {
  background-color: rgba(255, 255, 255, 0.9);
  width: 0%;
  height: 100%;
  border-radius: 25px;
  float: left;
  transition: width 0.3s;
}`;

export const arButtonCSS: CSSResult = css`
#ar-button {
  background-image: url(https://modelviewer.dev/shared-assets/icons/ic_view_in_ar_new_googblue_48dp.png);
  background-repeat: no-repeat;
  background-size: 20px 20px;
  background-position: 12px 50%;
  background-color: #fff;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
  bottom: 16px;
  padding: 0px 16px 0px 40px;
  font-family: Roboto Regular, Helvetica Neue, sans-serif;
  font-size: 14px;
  color:#4285f4;
  height: 36px;
  line-height: 36px;
  border-radius: 18px;
  border: 1px solid #DADCE0;
}

#ar-button:active {
  background-color: #E8EAED;
}

#ar-button:focus {
  outline: none;
}

#ar-button:focus-visible {
  outline: 1px solid #4285f4;
}`;

export const arPromptCSS: CSSResult = css`
@keyframes circle {
  from { transform: translateX(-50%) rotate(0deg) translateX(50px) rotate(0deg); }
  to   { transform: translateX(-50%) rotate(360deg) translateX(50px) rotate(-360deg); }
}

@keyframes elongate {
  from { transform: translateX(100px); }
  to   { transform: translateX(-100px); }
}

model-viewer > #ar-prompt {
  position: absolute;
  left: 50%;
  bottom: 60px;
  animation: elongate 2s infinite ease-in-out alternate;
  display: none;
}

model-viewer[ar-status="session-started"] > #ar-prompt {
  display: block;
}

model-viewer > #ar-prompt > img {
  animation: circle 4s linear infinite;
}`;