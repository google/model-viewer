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

import { customElement } from 'lit/decorators.js';

import { TabBase } from '@material/mwc-tab/mwc-tab-base';
import { styles as baseStyles } from '@material/mwc-tab/mwc-tab.css';
import { tabStyles } from './styles.css';

declare global {
  interface HTMLElementTagNameMap {
    'me-tab': Tab;
  }
}

@customElement('me-tab')
export class Tab extends TabBase {
  // MWC tab did not allow us to modify min-width, so we have to override the
  // styles ourselves. M2 MWC has sent out its final release  as they are now
  // focusing on M3 making this safe to override according to:
  // https://lit-and-friends.slack.com/archives/CC0Q3PRCL/p1651599492903519
  static override styles = [baseStyles, tabStyles];
}
