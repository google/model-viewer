/*
 * Copyright 2018 Google Inc. All Rights Reserved.
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

import './images-4-up.js';

import '@polymer/paper-slider';
import {html, LitElement, property} from 'lit-element';

import {AnalysisCompletedMessage, Dimensions, ImageComparisonMessage, ImageComparisonResults} from '../common.js';
import {ImageAccessor} from '../image-accessor.js';


export class AnalysisView extends LitElement {
  @property({type: Object}) leftImage: HTMLImageElement|null = null;
  @property({type: Object}) rightImage: HTMLImageElement|null = null;

  @property({type: Object}) analysisResult: ImageComparisonResults|null = null;

  @property({type: Object})
  protected leftImageAccessor: ImageAccessor|null = null;
  @property({type: Object})
  protected rightImageAccessor: ImageAccessor|null = null;
  @property({type: Object})
  protected blackWhiteImageAccessor: ImageAccessor|null = null;
  @property({type: Object})
  protected deltaImageAccessor: ImageAccessor|null = null;

  @property({type: Number}) protected threshold: number = 5;

  protected worker: Worker;
  protected port: MessagePort;

  constructor() {
    super();

    const channel = new MessageChannel();

    this.port = channel.port1;
    this.worker = new Worker('../../dist/image-comparison-worker.js');
    this.worker.postMessage('connect', [channel.port2]);
    this.port.onmessage = (event) => this.onMessage(event);
    this.port.start();
  }

  onMessage(event: MessageEvent) {
    const data = event.data as ImageComparisonMessage;
    const {type} = data;

    switch (type) {
      case 'analysis-completed':

        this.analysisResult = (data as AnalysisCompletedMessage).result;

        break;
      default:
        break;
    }
  }

  async connectedCallback() {
    super.connectedCallback && super.connectedCallback();

    document.body.addEventListener('click', (event) => {
      const originatingElement = (event as any).path[0] as HTMLElement;

      if (originatingElement.tagName !== 'IMG') {
        return;
      }

      if ((originatingElement.parentNode! as HTMLElement)
              .classList.contains('selected')) {
        this.deselect(originatingElement as HTMLImageElement);
      } else {
        this.select(originatingElement as HTMLImageElement);
      }
    });

    await this.updateComplete;

    const candidateCanvas =
        (this.shadowRoot!.querySelector('canvas[slot="top-left"]')! as any)
            .transferControlToOffscreen();

    const goldenCanvas =
        (this.shadowRoot!.querySelector('canvas[slot="top-right"]')! as any)
            .transferControlToOffscreen();
    const blackWhiteCanvas =
        (this.shadowRoot!.querySelector('canvas[slot="bottom-left"]')! as any)
            .transferControlToOffscreen();

    const deltaCanvas =
        (this.shadowRoot!.querySelector('canvas[slot="bottom-right"]')! as any)
            .transferControlToOffscreen();

    this.port.postMessage(
        {
          type: 'canvases-ready',
          candidateCanvas,
          goldenCanvas,
          blackWhiteCanvas,
          deltaCanvas
        },
        [candidateCanvas, goldenCanvas, blackWhiteCanvas, deltaCanvas]);
  }

  get canCompareImages(): boolean {
    return this.leftImage != null && this.rightImage != null;
  }

  deselect(element: HTMLImageElement) {
    if (this.leftImage === element) {
      this.leftImage = this.rightImage;
      this.rightImage = null;
    } else if (this.rightImage === element) {
      this.rightImage = null;
    }

    (element.parentNode! as HTMLElement).classList.remove('selected');
  }

  select(element: HTMLImageElement) {
    if (this.leftImage == null) {
      this.leftImage = element;
    } else if (this.rightImage == null) {
      this.rightImage = element;
    } else {
      return;
    }

    (element.parentNode! as HTMLElement).classList.add('selected');
  }

  enterAnalysisView() {
    if (this.canCompareImages) {
      this.classList.add('compare');
    }
  }

  exitAnalysisView() {
    this.classList.remove('compare');
  }

  reset() {
    if (this.rightImage != null) {
      this.deselect(this.rightImage);
    }

    if (this.leftImage != null) {
      this.deselect(this.leftImage);
    }
  }

  get comparisonDimensions(): Dimensions {
    if (this.canCompareImages) {
      const width =
          Math.max(this.leftImage!.naturalWidth, this.rightImage!.naturalWidth);
      const height = Math.max(
          this.leftImage!.naturalHeight, this.rightImage!.naturalHeight);

      return {width, height};
    }

    return {width: 0, height: 0};
  }

  async updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);

    if (changedProperties.has('analysisResult') &&
        this.analysisResult != null && this.canCompareImages) {
      const {imageBuffers} = this.analysisResult;
      const {width, height} = this.comparisonDimensions;

      this.blackWhiteImageAccessor = ImageAccessor.fromArrayBuffer(
          imageBuffers.blackWhite!, width, height);

      this.deltaImageAccessor =
          ImageAccessor.fromArrayBuffer(imageBuffers.delta!, width, height);
    }

    if ((changedProperties.has('leftImage') ||
         changedProperties.has('rightImage')) &&
        this.canCompareImages) {
      this.leftImageAccessor = ImageAccessor.fromImageElement(this.leftImage!);
      this.rightImageAccessor =
          ImageAccessor.fromImageElement(this.rightImage!);

      const {width, height} = this.comparisonDimensions;
      const candidateImageBuffer = this.leftImageAccessor.toArrayBuffer();
      const goldenImageBuffer = this.rightImageAccessor.toArrayBuffer();

      this.port.postMessage(
          {
            type: 'images-assigned',
            candidateImageBuffer,
            goldenImageBuffer,
            dimensions: {width, height}
          },
          [
            candidateImageBuffer as ArrayBuffer,
            goldenImageBuffer as ArrayBuffer
          ]);

      this.port.postMessage(
          {type: 'threshold-changed', threshold: this.threshold});
    }

    if (changedProperties.has('threshold') && this.canCompareImages) {
      this.port.postMessage(
          {type: 'threshold-changed', threshold: this.threshold});
    }
  }

  render() {
    let instructions;

    if (this.canCompareImages) {
      instructions = html`
<button @click="${() => this.enterAnalysisView()}">
  Compare selected images
</button>
<button @click="${() => this.reset()}" class="no-border">
  Clear selections
</button>`;
    } else {
      instructions = html`<p>Select two images to compare them!</p>`;
    }

    return html`
<style>
:host {
  display: block;
  position: fixed;
  width: 100vw;
  bottom: 0;
  left: 0;

  font-family: Google Sans, sans-serif;
  background-color: #37474f;
  color: #fff;

  box-shadow: 0px 3px 12px rgba(100, 100, 100, 0.3);
}

#instructions {
  text-align: center;
  font-style: italic;
  padding: 1em;
}

button {
  font-family: Google Sans, sans-serif;
  text-transform: uppercase;
  color: #fff;
  background-color: #37474f;
  border: 1px solid #fff;
  border-radius: 3px;
  font-size: 1.1em;
  font-weight: 200;
  padding: 0.45em 0.85em;
  cursor: pointer;
}

button {
  margin: 0.35em 0;
}

button:hover, button:focus {
  background-color: #62727b;
}

#comparison {
  display: flex;
  position: fixed;
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background-color: #37474f;
  transform: translateY(1vh);
  opacity: 0;
  pointer-events: none;
  transition: transform 0.3s, opacity 0.3s;
}

:host(.compare) #comparison {
  transform: translateY(0);
  opacity: 1;
  pointer-events: unset;
}

button.no-border {
  border: none;
}

.exit {
  margin: 0;
  border: 0;
  font-size: 0;
  line-height: 0;

  position: absolute;
  right: 32px;
  top: 32px;
  width: 32px;
  height: 32px;
  opacity: 0.75;
}

.exit:hover {
  opacity: 1;
}

.exit:before, .exit:after {
  content: ' ';
  position: absolute;
  top: 0px;
  left: 15px;
  height: 33px;
  width: 2px;
  background-color: #fff;
}

.exit:before {
  transform: rotate(45deg);
}
.exit:after {
  transform: rotate(-45deg);
}

images-4-up {
  flex: 1 1 100%;
}

#controls {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 90px;

  color: #fff;
  --primary-text-color: #fff;
  --paper-slider-active-color: #fff;
  --paper-slider-pin-color: #fff;
  --paper-slider-knob-color: #fff;
  --paper-slider-font-color: #444;
}

canvas {
  width: 100%;
  height: 100%;
}
</style>
<div id="instructions">
  ${instructions}
</div>
<div id="comparison">
  <images-4-up .dimensions="${this.comparisonDimensions}"
      .topLeftImageAccessor="${this.leftImageAccessor}"
      .topRightImageAccessor="${this.rightImageAccessor}"
      .bottomLeftImageAccessor="${this.blackWhiteImageAccessor}"
      .bottomRightImageAccessor="${this.deltaImageAccessor}">
    <canvas slot="top-left"></canvas>
    <canvas slot="top-right"></canvas>
    <canvas slot="bottom-left"></canvas>
    <canvas slot="bottom-right"></canvas>
  </images-4-up>
  <div id="controls">
    <label id="threshold-label">Threshold</label>
    <paper-slider
        @change="${
        (event: Event) => this.threshold =
            parseInt((event.target as HTMLInputElement).value, 10)}"
        aria-labelledby="threshold-label"
        min="0" max="10" step="1" pin snaps value="5" editable>
    </paper-slider>
  </div>
  <button class="exit" @click="${() => this.exitAnalysisView()}">Exit</button>
</div>`
  }
}

customElements.define('analysis-view', AnalysisView);
