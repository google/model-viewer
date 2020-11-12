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
import './components/fov_limits.js';
import './components/zoom.js';
import '../shared/checkbox/checkbox.js';
import '@material/mwc-button';
import '../shared/expandable_content/expandable_tab.js';
import '../shared/section_row/section_row.js';
import '../shared/draggable_input/draggable_input.js';
import '../shared/checkbox/checkbox.js';

import {checkFinite, ModelViewerConfig} from '@google/model-viewer-editing-adapter/lib/main.js';
import {customElement, html, internalProperty, LitElement, property, query} from 'lit-element';

import {reduxStore} from '../../space_opera_base.js';
import {cameraSettingsStyles} from '../../styles.css.js';
import {State} from '../../types.js';
import {dispatchAutoRotate, dispatchCameraControlsEnabled, getConfig} from '../config/reducer.js';
import {ConnectedLitElement} from '../connected_lit_element/connected_lit_element.js';
import {getModelViewer} from '../model_viewer_preview/model_viewer.js';
import {getCameraState} from '../model_viewer_preview/model_viewer_preview.js';
import {CheckboxElement} from '../shared/checkbox/checkbox.js';
import {DraggableInput} from '../shared/draggable_input/draggable_input.js';
import {styles as draggableInputRowStyles} from '../shared/draggable_input/draggable_input_row.css.js';

import {Camera, INITIAL_CAMERA} from './camera_state.js';
import {dispatchCameraTarget, dispatchInitialOrbit, dispatchRadiusLimits, dispatchSaveCameraOrbit, getCamera, getInitialCamera} from './reducer.js';
import {Limits, SphericalPositionDeg, Vector3D} from './types.js';

@customElement('me-camera-orbit-editor')
class CameraOrbitEditor extends LitElement {
  static styles = [draggableInputRowStyles];

  @query('me-draggable-input#yaw') yawInput?: DraggableInput;
  @query('me-draggable-input#pitch') pitchInput?: DraggableInput;
  @query('me-draggable-input#radius') radiusInput?: DraggableInput;

  @property({type: Object}) orbit?: SphericalPositionDeg;

  get currentOrbit() {
    if (!this.yawInput || !this.pitchInput || !this.radiusInput) {
      throw new Error('Rendering not complete');
    }
    return {
      phiDeg: this.pitchInput.value,
      thetaDeg: this.yawInput.value,
      radius: this.radiusInput.value,
    };
  }

  private onChange() {
    this.dispatchEvent(new CustomEvent('change'));
  }

  render() {
    if (!this.orbit)
      return html``;
    return html`
        <me-draggable-input
          id="yaw"
          innerLabel="yaw"
          value=${this.orbit.thetaDeg}
          min=-9999 max=9999
          @change=${this.onChange}>
        </me-draggable-input>

        <me-draggable-input
          id="pitch"
          innerLabel="pitch"
          value=${this.orbit.phiDeg}
          min=-9999 max=9999
          @change=${this.onChange}>
        </me-draggable-input>

        <me-draggable-input 
          id="radius"
          innerLabel="dist"
          value=${this.orbit.radius}
          min=-9999 max=9999
          @change=${this.onChange}>
        </me-draggable-input>
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

  stateChanged(state: State) {
    this.target = getCamera(state).target ?? getInitialCamera(state).target;
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
    this.initialCamera = getInitialCamera(state);
  }

  onCamControlsCheckboxChange(event: Event) {
    reduxStore.dispatch(dispatchCameraControlsEnabled(
        (event.target as HTMLInputElement).checked));
  }

  onSaveCameraOrbit() {
    const modelViewer = getModelViewer()!;
    const currentOrbit = getCameraState(modelViewer).orbit;
    // currentOrbit returns in mmeters
    const currentFieldOfViewDeg = getCameraState(modelViewer).fieldOfViewDeg;
    reduxStore.dispatch(
        dispatchSaveCameraOrbit(currentOrbit, currentFieldOfViewDeg));
  }

  onCameraTargetChange(newValue: Vector3D) {
    reduxStore.dispatch(dispatchCameraTarget(newValue));
  }

  onAutoRotateChange() {
    reduxStore.dispatch(dispatchAutoRotate(this.autoRotateCheckbox.checked));
  }

  render() {
    return html`
    <me-expandable-tab tabName="Camera Setup">
      <div slot="content">
        <me-card title="Camera Settings">
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
          </div>
        </me-card>
        <me-card title="Initial Camera Position">
          <div slot="content">
            <me-camera-orbit-editor
              @change=${this.onCameraOrbitEditorChange}
              .orbit=${
        this.camera.orbit ??
        this.initialCamera.orbit}>
            </me-camera-orbit-editor>
            <mwc-button
              class="SaveCameraButton"
              id="save-camera-angle"
              unelevated
              icon="photo_camera"
              @click=${this.onSaveCameraOrbit}>
              Save current as initial
            </mwc-button>
            <div class="InitialCameraNote"><small>Note: Setting the initial camera will break seamless poster transitions for your model.</small></div>
            <div class="InitialCameraNote"><small>Note: Set your max and min zoom before setting the initial camera or else clipping may occur.</small></div>
          </div>
        </me-card>
        <me-card title="Target Point">
          <div slot="content">
            <me-camera-target-input .change=${this.onCameraTargetChange}>
            </me-camera-target-input>
          </div>
        </me-card>
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
    const radiusLimits: Limits = {
      enabled: true,
      min: 'auto',
      max: this.cameraOrbitEditor.currentOrbit.radius
    };
    // Set field of view to max value
    const modelViewer = getModelViewer()!;
    modelViewer.fieldOfView = '45deg'

    reduxStore.dispatch(dispatchRadiusLimits(radiusLimits));
    reduxStore.dispatch(
        dispatchInitialOrbit(this.cameraOrbitEditor.currentOrbit));
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
