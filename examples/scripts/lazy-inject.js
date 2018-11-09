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

/**
 * A simple <lazy-inject> element that displays its contents, except
 * a `slot=lazy` template which will replace the <lazy-inject> element
 * upon calling `.inject()`
 */
class LazyInjectElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const template = document.createElement('template');
    template.innerHTML = `<slot></slot>`;
    this.shadowRoot.appendChild(template.content.cloneNode(true));
  }

  inject() {
    // Inject the lazy content adjacent to this element and remove
    // this element from the tree
    const slotTemplate = this.querySelector('[slot=lazy]');
    this.parentNode.insertBefore(slotTemplate.content.cloneNode(true), this);
    this.parentNode.removeChild(this);
  }
}
customElements.define('lazy-inject', LazyInjectElement);
