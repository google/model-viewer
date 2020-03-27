/* @license
 * Copyright 2019 Google LLC. All Rights Reserved.
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

import {Camera, Matrix4, Vector3} from 'three';

import {IS_WEBXR_AR_CANDIDATE} from '../../constants.js';
import ModelViewerElementBase, {$renderer, $scene} from '../../model-viewer-base.js';
import {ARRenderer} from '../../three-components/ARRenderer.js';
import {ModelScene} from '../../three-components/ModelScene.js';
import {assetPath, timePasses, waitForEvent} from '../helpers.js';


const expect = chai.expect;

const applyPhoneRotation =
    (camera: Camera) => {
      // Rotate 180 degrees on Y (so it's not the default)
      // and angle 45 degrees towards the ground, like a phone.
      camera.matrix.identity()
          .makeRotationAxis(new Vector3(0, 1, 0), Math.PI)
          .multiply(new Matrix4().makeRotationAxis(
              new Vector3(1, 0, 0), -Math.PI / 4));
    }

class MockXRFrame implements XRFrame {
  constructor(public session: XRSession) {
  }

  // We don't use nor test the returned XRPose other than its existence.
  getPose(_xrSpace: XRSpace, _frameOfRef: XRReferenceSpace) {
    return {} as XRPose;
  }

  getViewerPose(_referenceSpace?: XRReferenceSpace):
  XRViewerPose{return {} as XRViewerPose}

  getHitTestResults(_xrHitTestSource: XRHitTestSource) {
    return [];
  }
}

customElements.define('model-viewer-element', ModelViewerElementBase);

suite('ARRenderer', () => {
  let element: ModelViewerElementBase;
  let arRenderer: ARRenderer;
  let xrSession: XRSession;

  let inputSources: Array<XRInputSource> = [];

  const setInputSources = (sources: Array<XRInputSource>) => {
    inputSources = sources;
  };

  const stubWebXrInterface = (arRenderer: ARRenderer) => {
    arRenderer.resolveARSession = async () => {
      class FakeSession extends EventTarget implements XRSession {
        public renderState: XRRenderState = {baseLayer: {} as XRLayer} as
            XRRenderState;

        public hitTestSources: Set<XRHitTestSource> =
            new Set<XRHitTestSource>();

        updateRenderState(_object: any) {
        }

        requestFrameOfReference() {
          return {};
        }

        async requestReferenceSpace(_type: XRReferenceSpaceType):
            Promise<XRReferenceSpace> {
          return {} as XRReferenceSpace;
        }

        get inputSources(): Array<XRInputSource> {
          return inputSources;
        }

        async requestHitTestSource(_options: XRHitTestOptionsInit):
            Promise<XRHitTestSource> {
          const result = {cancel: () => {}};

          this.hitTestSources.add(result);

          return result;
        }

        requestAnimationFrame() {
          return 1;
        }

        cancelAnimationFrame() {
        }

        async end() {
          this.dispatchEvent(new CustomEvent('end'));
        }
      }

      xrSession = new FakeSession();
      return xrSession;
    };
  };

  setup(() => {
    element = new ModelViewerElementBase();
    arRenderer = new ARRenderer(element[$renderer]);
  });

  teardown(async () => {
    await arRenderer.stopPresenting().catch(() => {});
  });

  // NOTE(cdata): It will be a notable day when this test fails
  test('does not support presenting to AR on any browser', async () => {
    expect(await arRenderer.supportsPresentation()).to.be.equal(false);
  });

  test('is not presenting if present has not been invoked', () => {
    expect(arRenderer.isPresenting).to.be.equal(false);
  });

  suite('when presenting a scene', () => {
    let modelScene: ModelScene;

    if (!IS_WEBXR_AR_CANDIDATE) {
      return;
    }

    setup(async () => {
      element.src = assetPath('models/Astronaut.glb');
      await waitForEvent(element, 'load');
      modelScene = element[$scene];
      stubWebXrInterface(arRenderer);
      setInputSources([]);
    });

    test('presents the model at its natural scale', async () => {
      const model = modelScene.model;

      await arRenderer.present(modelScene);

      expect(model.scale.x).to.be.equal(1);
      expect(model.scale.y).to.be.equal(1);
      expect(model.scale.z).to.be.equal(1);
    });

    suite('presentation ends', () => {
      test('restores the original model scale', async () => {
        const model = modelScene.model;
        const originalModelScale = model.scale.clone();

        await arRenderer.present(modelScene);
        await arRenderer.stopPresenting();

        expect(originalModelScale.x).to.be.equal(model.scale.x);
        expect(originalModelScale.y).to.be.equal(model.scale.y);
        expect(originalModelScale.z).to.be.equal(model.scale.z);
      });
    });

    suite('placing a model', () => {
      test('places the model oriented to the camera', async () => {
        const epsilon = 0.0001;
        const pivotRotation = 0.123;
        modelScene.model.rotation.y = pivotRotation;

        // Set camera to (10, 2, 0), rotated 180 degrees on Y (so
        // our dolly will need to rotate to face camera) and angled 45
        // degrees towards the ground, like someone holding a phone.
        applyPhoneRotation(arRenderer.camera);
        arRenderer.camera.matrix.setPosition(new Vector3(10, 2, 0));
        arRenderer.camera.updateMatrixWorld(true);

        await arRenderer.present(modelScene);
        await arRenderer.placeModel();
        const {position, rotation} = modelScene.model;

        expect(position.x).to.be.equal(10);
        expect(position.y).to.be.equal(0);
        expect(position.z).to.be.equal(2);
        // Quaternion rotation results in the rotation towards the viewer
        // with -X and -Z, and the offset applied to Y to invert pivotRotation,
        // but it's inverted again here due to the -X/-Z rotation encoding
        expect(rotation.x).to.be.equal(-Math.PI);
        expect(rotation.y).to.be.closeTo(pivotRotation, epsilon);
        expect(rotation.z).to.be.equal(-Math.PI);
      });

      test('when a screen-type XRInputSource exists', async () => {
        await arRenderer.present(modelScene);
        const {position} = modelScene.model;

        expect(position.x).to.be.equal(0);
        expect(position.y).to.be.equal(0);
        expect(position.z).to.be.equal(0);

        // Set camera to (10, 2, 0), rotated 180 degrees on Y,
        // and angled 45 degrees towards the ground, like a phone.
        applyPhoneRotation(arRenderer.camera);
        arRenderer.camera.matrix.setPosition(new Vector3(10, 2, 0));
        arRenderer.camera.updateMatrixWorld(true);

        setInputSources([{
          targetRayMode: 'screen' as XRTargetRayMode,
          handedness: '' as XRHandedness,
          targetRaySpace: {} as XRSpace,
          profiles: []
        }]);
        arRenderer.processXRInput(new MockXRFrame(xrSession));
        await waitForEvent(arRenderer, 'modelmove');

        expect(position.x).to.be.equal(10);
        expect(position.y).to.be.equal(0);
        expect(position.z).to.be.equal(2);


        // Move the camera, ensure model hasn't changed
        arRenderer.camera.matrix.setPosition(new Vector3(0, 1, 0));
        arRenderer.camera.updateMatrixWorld(true);
        setInputSources([]);
        arRenderer.processXRInput(new MockXRFrame(xrSession));
        await timePasses();

        expect(position.x).to.be.equal(10);
        expect(position.y).to.be.equal(0);
        expect(position.z).to.be.equal(2);
      });

      test('ignores non-screen-type XRInputSources', async () => {
        applyPhoneRotation(arRenderer.camera);
        arRenderer.camera.updateMatrixWorld(true);
        await arRenderer.present(modelScene);
        const {position} = modelScene.model;

        setInputSources([{
          targetRayMode: 'gaze' as XRTargetRayMode,
          handedness: '' as XRHandedness,
          targetRaySpace: {} as XRSpace,
          profiles: []
        }]);
        arRenderer.processXRInput(new MockXRFrame(xrSession));
        await timePasses();

        expect(position.x).to.be.equal(0);
        expect(position.y).to.be.equal(0);
        expect(position.z).to.be.equal(0);
      });

      test('ignores when ray fails', async () => {
        applyPhoneRotation(arRenderer.camera);
        arRenderer.camera.matrix.setPosition(new Vector3(10, 2, 0));
        arRenderer.camera.updateMatrixWorld(true);
        await arRenderer.present(modelScene);
        await arRenderer.placeModel();
        const {position} = modelScene.model;

        expect(position.x).to.be.equal(10);
        expect(position.y).to.be.equal(0);
        expect(position.z).to.be.equal(2);

        // Now point phone upwards
        arRenderer.camera.matrix.identity().makeRotationAxis(
            new Vector3(1, 0, 0), Math.PI / 2);
        arRenderer.camera.matrix.setPosition(new Vector3(0, 2, 0));
        arRenderer.camera.updateMatrixWorld(true);
        await arRenderer.placeModel();

        expect(position.x).to.be.equal(10);
        expect(position.y).to.be.equal(0);
        expect(position.z).to.be.equal(2);
      });
    });
  });
});
