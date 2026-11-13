/**
 * @license
 * Copyright 2026 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

class CustomSelect extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
          font-family: inherit;
          font-size: 14px;
          user-select: none;
          margin: 0.25em;
          vertical-align: middle;
          color: #3c4043;
        }
        button {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.85);
          border: 1px solid rgba(0, 0, 0, 0.15);
          border-radius: 6px;
          padding: 6px 12px;
          min-width: 150px;
          cursor: pointer;
          font-family: inherit;
          font-size: inherit;
          font-weight: 500;
          color: inherit;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          transition: all 0.2s;
          outline: none;
        }
        button:hover {
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.25);
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
        button:focus-visible {
          border-color: #1a73e8;
          box-shadow: 0 0 0 2px rgba(26, 115, 232, 0.2);
        }
        .label {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-right: 8px;
        }
        .chevron {
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 4px solid #5f6368;
          margin-left: 8px;
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        button.open .chevron {
          transform: rotate(180deg);
        }
        .panel {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          min-width: 100%;
          z-index: 2000;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(0, 0, 0, 0.12);
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          max-height: 200px;
          overflow-y: auto;
          display: none;
        }
        .panel.open {
          display: block;
        }
        .panel.upward {
          top: auto;
          bottom: calc(100% + 4px);
          box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
        }
        ul {
          list-style: none;
          padding: 4px 0;
          margin: 0;
        }
        li {
          padding: 8px 12px;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.1s;
        }
        li:hover {
          background: rgba(26, 115, 232, 0.08);
          color: #1a73e8;
        }
        li.selected {
          background: rgba(26, 115, 232, 0.12);
          color: #1a73e8;
          font-weight: 600;
        }
        ::slotted(option) {
          display: none !important;
        }
      </style>
      <button id="btn"><span class="label" id="lbl">None</span><span class="chevron"></span></button>
      <div class="panel" id="panel"><ul id="list"></ul></div>
      <slot id="slot"></slot>
    `;
    this._value = '';
    this._selectedIndex = 0;
    this._isOpen = false;
  }

  get value() {
    return this._value;
  }

  set value(val) {
    const opts = Array.from(this.querySelectorAll('option'));
    const idx = opts.findIndex(o => (o.value || o.textContent) === val);
    if (idx !== -1) {
      this.selectedIndex = idx;
    }
  }

  get selectedIndex() {
    return this._selectedIndex;
  }

  set selectedIndex(idx) {
    const opts = Array.from(this.querySelectorAll('option'));
    const index = parseInt(idx, 10);
    if (index >= 0 && index < opts.length) {
      this._selectedIndex = index;
      this._value = opts[index].value || opts[index].textContent;
      this.shadowRoot.getElementById('lbl').textContent = opts[index].textContent;
      this.updateList();
    }
  }

  get options() {
    return Array.from(this.querySelectorAll('option')).map((opt, index) => ({
      value: opt.value || opt.textContent,
      text: opt.textContent,
      selected: index === this._selectedIndex
    }));
  }

  connectedCallback() {
    const btn = this.shadowRoot.getElementById('btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    
    this.shadowRoot.getElementById('slot').addEventListener('slotchange', () => this.sync());
    document.addEventListener('click', () => this.close());
    
    // CRITICAL FIX: Intercept beforexrselect on this element
    this.addEventListener('beforexrselect', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    
    // Prevent event bubbling to WebXR session on the panel list
    const stop = (e) => e.stopPropagation();
    const panel = this.shadowRoot.getElementById('panel');
    panel.addEventListener('pointerdown', stop);
    panel.addEventListener('mousedown', stop);
    panel.addEventListener('touchstart', stop);
    
    this.sync();
  }

  toggle() {
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open() {
    this._isOpen = true;
    const btn = this.shadowRoot.getElementById('btn');
    const panel = this.shadowRoot.getElementById('panel');
    btn.classList.add('open');
    panel.classList.add('open');

    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const panelHeight = Math.min(panel.scrollHeight, 200);

    if (spaceBelow < panelHeight + 10 && rect.top > panelHeight) {
      panel.classList.add('upward');
    } else {
      panel.classList.remove('upward');
    }

    const selectedItem = this.shadowRoot.querySelector('li.selected');
    if (selectedItem) {
      setTimeout(() => selectedItem.scrollIntoView({ block: 'nearest' }), 50);
    }
  }

  close() {
    this._isOpen = false;
    this.shadowRoot.getElementById('btn').classList.remove('open');
    const panel = this.shadowRoot.getElementById('panel');
    panel.classList.remove('open');
    panel.classList.remove('upward');
  }

  sync() {
    const list = this.shadowRoot.getElementById('list');
    list.innerHTML = '';
    const opts = Array.from(this.querySelectorAll('option'));
    
    // Check initial selected attribute
    const selectedOptIndex = opts.findIndex(o => o.hasAttribute('selected'));
    if (selectedOptIndex !== -1 && this._selectedIndex === 0 && !this._value) {
      this._selectedIndex = selectedOptIndex;
    }

    opts.forEach((opt, index) => {
      const li = document.createElement('li');
      li.textContent = opt.textContent;
      li.className = index === this._selectedIndex ? 'selected' : '';
      
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectedIndex = index;
        this.close();
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
      });
      list.appendChild(li);
    });

    if (opts.length > 0) {
      if (this._selectedIndex >= opts.length) {
        this._selectedIndex = 0;
      }
      const selectedOpt = opts[this._selectedIndex];
      this._value = selectedOpt.value || selectedOpt.textContent;
      this.shadowRoot.getElementById('lbl').textContent = selectedOpt.textContent;
    }
  }

  updateList() {
    const items = Array.from(this.shadowRoot.querySelectorAll('li'));
    items.forEach((item, index) => {
      item.className = index === this._selectedIndex ? 'selected' : '';
    });
  }
}

customElements.define('custom-select', CustomSelect);
