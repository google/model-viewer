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

type Constructor<T = object> = {
  new (...args: any[]): T,
  prototype: T
};

type XRReferenceSpaceType = 'local'|'local-floor'|'bounded-floor'|'unbounded';

interface XRFrameOfReferenceOptions {
  disableStageEmulation?: boolean;
  stageEmulationHeight?: number;
}

interface XRCoordinateSystem extends EventTarget {
  getTransformTo(other: XRCoordinateSystem): Float32Array;
}

interface XRStageBounds {
  readonly geometry: DOMPointReadOnly[];
}

interface XRFrameOfReference extends XRCoordinateSystem {
  readonly bounds?: XRStageBounds;
  readonly emulatedHeight: number;

  onboundschange?: (event: Event) => void;
}

interface XRPresentationContext {
  readonly canvas: HTMLCanvasElement;
}

interface XRSessionCreationOptions {
  immersive?: boolean;
  outputContext: XRPresentationContext;
}

interface XRHitResult {
  readonly hitMatrix: Float32Array;
}

interface XR extends EventTarget {
  requestDevice(): Promise<XRDevice>;
  requestSession(mode: any, options?: any): any;
  supportsSession(mode: any): Promise<XRSession>;
}

interface XRRigidTransform {
  readonly position: DOMPointReadOnly;
  readonly orientation: DOMPointReadOnly;
  readonly matrix: Float32Array;
}

interface XRSpace extends EventTarget {
  getTransformTo(other: XRSpace): XRRigidTransform;
}

interface XRReferenceSpace extends XRSpace {
  originOffset: XRRigidTransform;
}

type XREye = 'left'|'right';

interface XRView {
  readonly eye: XREye;
  readonly projectionMatrix: Float32Array;
  readonly viewMatrix: Float32Array;
  readonly transform: XRRigidTransform;
}

interface XRViewerPose {
  readonly transform: XRRigidTransform;
  readonly views: Array<XRView>
}

declare class XRRay {
  readonly origin: DOMPointReadOnly;
  readonly direction: DOMPointReadOnly;
  matrix: Float32Array;

  constructor(origin: DOMPointInit, direction: DOMPointInit)
}

interface XRPose {
  readonly emulatedPosition: boolean;
  readonly transform: XRRigidTransform;
}

type XRHandedness = ''|'left'|'right';
type XRTargetRayMode = 'gaze'|'tracked-pointer'|'screen';

interface XRInputSource {
  readonly handedness: XRHandedness;
  readonly targetRayMode: XRTargetRayMode;
  readonly targetRaySpace: XRSpace;
  readonly gripSpace?: XRSpace;
  readonly profiles: Array<String>;
}

interface XRFrame {
  readonly session: XRSession;
  getViewerPose(referenceSpace?: XRReferenceSpace): XRViewerPose;
  getPose(space: XRSpace, referenceSpace: XRReferenceSpace): XRPose;
}

type XRFrameRequestCallback = (time: number, frame: XRFrame) => void;

interface XRRenderState {
  readonly depthNear: number;
  readonly depthFar: number;
  readonly inlineVerticalFieldOfView?: number;
  readonly baseLayer?: XRWebGLLayer;
}

interface XRRenderStateInit {
  depthNear?: number;
  depthFar?: number;
  inlineVerticalFieldOfView?: number;
  baseLayer?: XRWebGLLayer;
}

interface XRSession extends EventTarget {
  renderState: XRRenderState;
  updateRenderState(state?: XRRenderStateInit): any;
  requestReferenceSpace(type: XRReferenceSpaceType): Promise<XRReferenceSpace>;
  requestHitTest(ray: XRRay, frameOfReference: XRFrameOfReference):
      Promise<XRHitResult[]>;
  inputSources: Array<XRInputSource>;
  requestAnimationFrame(callback: XRFrameRequestCallback): number;
  cancelAnimationFrame(id: number): void;
  end(): Promise<void>;
}

interface XRDevice {
  supportsSession(sessionOptions: XRSessionCreationOptions): Promise<boolean>;
  requestSession(sessionOptions: XRSessionCreationOptions): Promise<XRSession>;
}

interface XRViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface XRLayer {}

declare class XRWebGLLayer implements XRLayer {
  public framebuffer: WebGLFramebuffer;
  public framebufferWidth: number; 
  public framebufferHeight: number; 

  constructor(
      session: XRSession, gl: WebGLRenderingContext,
      options: WebGLContextAttributes)

  getViewport(view: XRView): XRViewport
}

interface Window {
  XRSession?: Constructor<XRSession>;
  XRDevice?: Constructor<XRDevice>;
  XR?: Constructor<XR>;
  XRHitResult?: Constructor<XRHitResult>;
}

interface Navigator {
  xr?: XR;
}

interface WebGLRenderingContext {
  setCompatibleXRDevice(device: XRDevice): void;
  makeXRCompatible(): Promise<void>;
}
