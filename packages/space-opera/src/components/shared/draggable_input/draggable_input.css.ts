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
  border-radius: 4px;
  display: inline-flex;
  justify-content: space-between;
  padding: 6px 12px;
  overflow: hidden;
  background: #3c4043;
  min-width: 60px;
  max-height: 19px;
  align-items: center;
}

.InlineInput {
  /* Disable Firefox native up/down arrows on number inputs */
  -moz-appearance:textfield;
  background: transparent;
  border: none;
  border-style: unset;
  flex: auto;
  font-size: 14px;
  outline: none;
  width: 0;
  color: #dadce0;
}

/**
 * Disable native up/down arrows on number inputs for browswers like Safari and
 * Chrome
 */
.InlineInput::-webkit-inner-spin-button,
.InlineInput::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.InlineLabel {
  color: #888;
  cursor: col-resize;
  margin-left: 12px;
  text-align: right;
  user-select: none;
}

/**
 * This is needed to persist the cursor style throughout a dragging motion
 * starting from a draggable input field label.
 */
.isDragging {
  cursor: col-resize;
}

/* This stops text fields from overriding the cursor when dragged over. */
.isDragging .isDraggingNoPointer {
  pointer-events: none;
}
`;
