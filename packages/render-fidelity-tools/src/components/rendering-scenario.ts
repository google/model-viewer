/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import {html, LitElement} from 'lit';
import {property} from 'lit/decorators.js';

import {Dimensions, GoldenConfig, ImageComparisonAnalysis, ScenarioRecord, toDecibel} from '../common.js';


const DEFAULT_DIMENSIONS: Dimensions = {
  width: 0,
  height: 0
};

export class RenderingScenario extends LitElement {
  @property({type: String}) name: string = '';

  @property({type: Object}) goldens: Array<GoldenConfig> = [];

  @property({type: Object}) dimensions: Dimensions = DEFAULT_DIMENSIONS;

  @property({type: Array}) exclude: Array<string> = [];

  @property({type: Object}) analysis: ScenarioRecord|null = null;

  get basePath() {
    if (!this.name) {
      return '';
    }

    return `./results/${this.name}`;
  }

  updated(changedProperties: Map<any, any>) {
    super.updated(changedProperties);

    if (this.analysis == null) {
      this.loadAnalysis();
    }
  }

  private async loadAnalysis() {
    const analysisPath = `${this.basePath}/analysis.json`;
    this.analysis = await (await fetch(analysisPath)).json();
  }

  private metricTemplate(
      analysisResults: ImageComparisonAnalysis, goldenName: string) {
    const rmsInDecibel = toDecibel(analysisResults.rmsDistanceRatio).toFixed(2);
    return html` <span>${rmsInDecibel} dB </span>
      <div class="tooltip">
        <span class="question-icon"> </span>
        <span class="tooltiptext">
          Root mean square(RMS) color distance between ${goldenName}'s golden
          and model-viewer's on rendering ${this.name} in decibels.
          The decibel is given by: 10 * log(RMS). More negative means a closer match.
        </span>
      </div>`
  }

  render() {
    const {basePath} = this;
    const {width} = this.dimensions;

    const images =
        this.goldens.filter(golden => !this.exclude.includes(golden.name))
            .map(
                (golden, index) => html`
              <div class="screenshot">
                <header>
                  <h2>${golden.description}</h2>
                </header>
                <div class="check"></div>
                <img data-id="${this.name} ${golden.name}"
                    style="width:${width}px" src="${basePath}/${golden.file}">
                  <div class = "metrics">
                    ${
                    index == 0 || this.analysis == null ?
                        html`<span>---</span>` :
                        this.metricTemplate(
                            this.analysis.analysisResults[index - 1],
                            golden.name)}
                  </div>
              </div>`);

    return html`

<style>
:host {
  display: inline-flex;
  flex-direction: column;
  flex: 0 1 auto;
  position: relative;
  margin: 1em;
  padding: 1em;
  border-radius: 3px;
  box-shadow: 0px 2px 8px rgba(100, 100, 100, 0.2);
  background-color: #fff;
  color: #555;
  font-family: Google Sans, sans-serif;
}

h1 {
  font-size: 1.5em;
  margin: 0.166em 0.33em 0.33em;
}

.tooltip {
  position: relative;
  display: inline-block;
}

.tooltip .tooltiptext {
  opacity: 0.4;
  visibility: hidden;
  width: 200px;
  font-size: 0.8em;
  background-color: black;
  color: #fff;
  text-align: left;
  border-radius: 6px;
  padding: 5px 5px;
  position: absolute;
  z-index: 1;
}

.tooltip:hover .tooltiptext {
  visibility: visible;
}

.question-icon {
  background-image: url(../../shared-assets/icons/help_outline-24px.svg);
  background-size : 0.8em;
  background-repeat: no-repeat;
  background-position: 0% 100%;
  width: 1em;
  height: 1em;
  display: inline-block;
}

.metrics {
  text-align: center;
  height: 2em;
}

.screenshot > header {
  display: block;
  position: absolute;
  width: 100%;
  bottom: 2em;
  left: 0;
  text-align: center;
  pointer-events: none;
}

h2 {
  font-size: 1em;

  display: inline-block;
  box-sizing: border-box;

  border-radius: 3px;
  padding: 0.25em 0.5em;
  margin: 0;

  background-color: rgba(255, 255, 255, 0.75);
  pointer-events: none;
}

#screenshots {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: 544px;
  align-items: center;
  flex-wrap: nowrap;
}

.screenshot {
  box-sizing: border-box;
  display: flex;
  position: relative;
  flex-direction: column;
  object-fit: contain;
  margin: 0.5em;
  transition: transform 0.3s;
}

.screenshot > img {
  max-width: 256px;
  flex: 0 0 0;
}

.check {
  display: flex;
  position: absolute;
  align-items: center;
  justify-content: center;
  box-sizing: bborder-box;
  top: 0.5em;;
  right: 0.5em;
  width: 1em;
  height: 1em;
  border-radius: 2em;
  border: 2px solid #fff;
  background-color: #f8f8f8;
}

.selected .check {
  background-color: #37474f;
}

.selected .check:after {
  content: '';
  display: block;
  width: 0.25em;
  height: 0.5em;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: translate(-0em, -0.1em) rotate(45deg);
}

.selected {
  transform: translateY(-0.5em) scale(1.025);
  box-shadow: 0px 6px 12px rgba(100, 100, 100, 0.2);
}
</style>
<h1><a href="#${this.name}">${this.name}</a></h1>
<div id="screenshots">
  ${images}
</div>`;
  }
}

customElements.define('rendering-scenario', RenderingScenario);
