
import {css, customElement, html, LitElement, property} from 'lit-element';
import {ScenarioConfig} from '../../common.js';
import Rn from 'rhodonite';

const $updateSize = Symbol('updateSize');
const $updateScenario = Symbol('updateScenario');
const $canvas = Symbol('canvas');

@customElement('rhodonite-viewer')
export class RhodoniteViewer extends LitElement {
  @property({type: Object}) scenario: ScenarioConfig|null = null;
  private[$canvas]: HTMLCanvasElement|null;

  static get styles() {
      return css`
  :host {
    display: block;
  }
  `;
  }

  render() {
    return html`<canvas id="canvas"></canvas>`;
  }

  updated(changedProperties: Map<string, any>) {
    super.updated(changedProperties);
    this[$updateSize]();

    if (changedProperties.has('scenario') && this.scenario != null) {
      this[$updateScenario](this.scenario);
    }
  }

  private async[$updateScenario](scenario: ScenarioConfig) {

  }

  private[$updateSize]() {
    
  }
}
