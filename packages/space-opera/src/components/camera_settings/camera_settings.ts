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

import './components/pitch_limits.js';
import './components/yaw_limits.js';
import './components/zoom.js';
import '../shared/checkbox/checkbox.js';
import '@material/mwc-button';
import '../shared/expandable_content/expandable_tab.js';
import '../shared/section_row/section_row.js';
import '../shared/draggable_input/draggable_input.js';
import '../shared/checkbox/checkbox.js';

import {checkFinite, ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js';
import {customElement, html, internalProperty, property, query} from 'lit-element';

import {reduxStore} from '../../space_opera_base.js';
import {cameraSettingsStyles} from '../../styles.css.js';
import {State} from '../../types.js';
import {dispatchAutoRotate, dispatchCameraControlsEnabled, getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getCameraState, getModelViewer} from '../model_viewer_preview/reducer.js';
import {CheckboxElement} from '../shared/checkbox/checkbox.js';
import {DraggableInput} from '../shared/draggable_input/draggable_input.js';
import {styles as draggableInputRowStyles} from '../shared/draggable_input/draggable_input_row.css.js';

import {Camera, INITIAL_CAMERA} from './camera_state.js';
import {dispatchCameraTarget, dispatchRadiusLimits, dispatchSaveCameraOrbit, getCamera} from './reducer.js';
import {Limits, SphericalPositionDeg, Vector3D} from './types.js';

@customElement('me-camera-orbit-editor')
class CameraOrbitEditor extends ConnectedLitElement {
  static styles = [cameraSettingsStyles, draggableInputRowStyles];

  @query('me-draggable-input#yaw') yawInput?: DraggableInput;
  @query('me-draggable-input#pitch') pitchInput?: DraggableInput;

  @property({type: Object}) orbit?: SphericalPositionDeg;

  get currentOrbit() {
    if (!this.yawInput || !this.pitchInput) {
      throw new Error('Rendering not complete');
    }
    return {
      phiDeg: this.pitchInput.value,
      thetaDeg: this.yawInput.value,
    };
  }

  private onChange() {
    this.dispatchEvent(new CustomEvent('change'));
  }

  render() {
    if (!this.orbit)
      return html``;
    return html`
      <div style="justify-content: space-between; width: 100%; display: flex;">
        <div>
          <me-draggable-input
            id="yaw"
            innerLabel="yaw"
            value=${this.orbit.thetaDeg}
            min=-9999 max=9999
            style="min-width: 90px; max-width: 90px;"
            @change=${this.onChange}>
          </me-draggable-input>
          <me-draggable-input
            id="pitch"
            innerLabel="pitch"
            value=${this.orbit.phiDeg}
            min=-9999 max=9999
            style="min-width: 90px; max-width: 90px;"
            @change=${this.onChange}>
          </me-draggable-input>
        </div>
      </div>
`;
  }
}

/** Camera target input panel. */
@customElement('me-camera-target-input')
export class CameraTargetInput extends ConnectedLitElement {
  static styles = [draggableInputRowStyles, cameraSettingsStyles];

  @query('me-draggable-input#camera-target-x') xInput!: HTMLInputElement;
  @query('me-draggable-input#camera-target-y') yInput!: HTMLInputElement;
  @query('me-draggable-input#camera-target-z') zInput!: HTMLInputElement;

  @property({attribute: false}) change?: (newValue: Vector3D) => void;
  @internalProperty() target?: Vector3D;

  // @ts-ignore
  stateChanged(state: State) {
    const modelViewer = getModelViewer();
    if (modelViewer != null) {
      this.target = getCameraState(modelViewer).target;
    } else {
      this.target = undefined;
    }
  }

  protected onInputChange(event: Event) {
    event.preventDefault();
    if (!this.change) {
      return;
    }

    const target = {
      x: checkFinite(Number(this.xInput.value)),
      y: checkFinite(Number(this.yInput.value)),
      z: checkFinite(Number(this.zInput.value)),
    };
    this.change(target);
  }

  render() {
    if (!this.target) {
      return html`<div class="note">Waiting for camera target...</div>`;
    }
    return html`
        <me-draggable-input value=${this.target.x}
        id="camera-target-x" min=-9999 max=9999 dragStepSize=0.01 @change=${
        this.onInputChange} innerLabel="X"></me-draggable-input>
        <me-draggable-input id="camera-target-y" min=-9999 max=9999 dragStepSize=0.01 value=${
        this.target.y} @change=${
        this.onInputChange} innerLabel="Y"></me-draggable-input>
        <me-draggable-input id="camera-target-z" value=${
        this.target.z} min=-9999 max=9999 dragStepSize=0.01 @change=${
        this.onInputChange} innerLabel="Z"></me-draggable-input>
        `;
  }
}

/** The Camera Settings panel. */
@customElement('me-camera-settings')
export class CameraSettings extends ConnectedLitElement {
  static styles = cameraSettingsStyles;

  @internalProperty() config: ModelViewerConfig = {};
  @internalProperty() camera: Camera = INITIAL_CAMERA;
  @internalProperty() initialCamera: Camera = INITIAL_CAMERA;
  @internalProperty() cameraOutOfBounds: boolean = false;

  @query('me-camera-orbit-editor') cameraOrbitEditor?: CameraOrbitEditor;
  @query('me-checkbox#auto-rotate') autoRotateCheckbox!: CheckboxElement;

  // Specifically overriding a super class method.
  // tslint:disable-next-line:enforce-name-casing
  async _getUpdateComplete() {
    await super._getUpdateComplete();
    await this.cameraOrbitEditor!.updateComplete;
    await this.autoRotateCheckbox.updateComplete;
  }

  stateChanged(state: State) {
    this.config = getConfig(state);
    this.camera = getCamera(state);
    this.cameraOutOfBounds = this.outOfBounds();
  }

  orbitValueBound(limits: Limits|undefined, val: string|number) {
    if ((limits !== undefined) &&
        ((limits.max !== 'auto' && val > limits.max) ||
         (limits.min !== 'auto' && val < limits.min))) {
      return true;
    }
    return false;
  }

  outOfBounds() {
    const snippet = this.camera;
    if (snippet.orbit === undefined) {
      return false;
    }
    if (this.orbitValueBound(snippet.pitchLimitsDeg, snippet.orbit?.phiDeg)) {
      return true;
    } else if (this.orbitValueBound(
                   snippet.yawLimitsDeg, snippet.orbit?.thetaDeg)) {
      return true;
    } else if (this.orbitValueBound(
                   snippet.radiusLimits, snippet.orbit?.radius)) {
      return true;
    }
    return false;
  }

  onCamControlsCheckboxChange(event: Event) {
    reduxStore.dispatch(dispatchCameraControlsEnabled(
        (event.target as HTMLInputElement).checked));
  }

  onSaveCameraOrbit() {
    const modelViewer = getModelViewer()!;
    const cameraState = getCameraState(modelViewer);
    const currentOrbit = cameraState.orbit;
    reduxStore.dispatch(dispatchSaveCameraOrbit(currentOrbit));

    // set max radius to current value
    const radiusLimits: Limits = {
      enabled: true,
      min: cameraState.radiusLimits?.min ?? 'auto',
      max: currentOrbit?.radius ?? 'auto'
    };
    reduxStore.dispatch(dispatchRadiusLimits(radiusLimits));
  }

  resetInitialCamera() {
    reduxStore.dispatch(dispatchSaveCameraOrbit(undefined));
    const modelViewer = getModelViewer()!;
    const cameraState = getCameraState(modelViewer);
    // set max radius to current value
    const radiusLimits: Limits = {
      enabled: true,
      min: cameraState.radiusLimits?.min ?? 'auto',
      max: 'auto'
    };
    reduxStore.dispatch(dispatchRadiusLimits(radiusLimits));
  }

  onCameraTargetChange(newValue: Vector3D) {
    reduxStore.dispatch(dispatchCameraTarget(newValue));
  }

  onAutoRotateChange() {
    reduxStore.dispatch(dispatchAutoRotate(this.autoRotateCheckbox.checked));
  }

  render() {
    const initalError = this.cameraOutOfBounds ? 'initialError' : ''
    return html`
    <me-expandable-tab tabName="Camera Setup" .open=${true}>
      <div slot="content">
        <me-checkbox id="cam-controls-checkbox" label="Interactive camera"
          ?checked="${!!this.config.cameraControls}"
          @change=${this.onCamControlsCheckboxChange}>
        </me-checkbox>
        ${
    !this.config.cameraControls ?
        html`<div class="note"><small>Note: Camera interaction is always enabled in the preview, but will not be on your page.</small></div>` :
        ``}
        <me-checkbox id="auto-rotate" label="Auto-rotate"
          ?checked="${!!this.config.autoRotate}"
          @change=${this.onAutoRotateChange}>
        </me-checkbox>
        <div class="${initalError}">
          <div style="font-size: 14px; font-weight: 500; margin-top: 10px">Initial Camera Position:</div>
          <me-camera-orbit-editor
            @change=${this.onCameraOrbitEditorChange}
            .orbit=${
        this.camera.orbit ??
        this.initialCamera.orbit}>
          </me-camera-orbit-editor>
          <div style="justify-content: space-between; width: 100%; display: flex;">
            <mwc-button
              class="SaveCameraButton"
              id="save-camera-angle"
              unelevated
              icon="photo_camera"
              style="align-self: center"
              @click=${this.onSaveCameraOrbit}>
              Save current as initial
            </mwc-button>
            <mwc-icon-button class="RevertButton" style="align-self: center; margin-top: 10px;" id="revert-metallic-roughness-texture" icon="undo"
            title="Reset initial camera" @click=${this.resetInitialCamera}>
            </mwc-icon-button>
          </div>
          ${
        this.cameraOutOfBounds ?
        html`<div class="error">Your initial camera is outside the bounds of your limits. Set your initial camera again.</div>` :
        html``}
        </div>
        <div style="font-size: 14px; font-weight: 500; margin-top: 20px">Target Point:</div>
        <me-camera-target-input .change=${this.onCameraTargetChange}>
        </me-camera-target-input>
      </div>
    </me-expandable-tab>

<me-expandable-tab tabName="Customize Limits">
  <div slot="content">
    <me-camera-yaw-limits></me-camera-yaw-limits>
    <me-camera-pitch-limits></me-camera-pitch-limits>
    <me-camera-zoom-limits></me-camera-zoom-limits>
  </div>
</me-expandable-tab>
`;
  }

  get currentCameraOrbit() {
    return this.cameraOrbitEditor?.currentOrbit;
  }

  onCameraOrbitEditorChange() {
    if (!this.cameraOrbitEditor)
      return;
    // Set min/max radius limits before setting radius such that we don't clip.
    const modelViewer = getModelViewer()!;
    if (!modelViewer)
      return;

    const currentOrbit = getCameraState(modelViewer).orbit;
    const radiusLimits:
        Limits = {enabled: true, min: 'auto', max: currentOrbit!.radius};
    reduxStore.dispatch(dispatchRadiusLimits(radiusLimits));

    const orb = {
      ...this.cameraOrbitEditor.currentOrbit,
      radius: currentOrbit?.radius!,
    };
    reduxStore.dispatch(dispatchSaveCameraOrbit(orb));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'me-camera-orbit-editor': CameraOrbitEditor;
    'me-camera-settings': CameraSettings;
    'me-camera-target-input': CameraTargetInput;
    'me-draggable-input': DraggableInput;
  }
}
