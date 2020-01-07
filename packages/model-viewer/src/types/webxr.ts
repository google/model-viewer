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

declare type Constructor<T = object> = {
  new (...args: any[]): T,
  prototype: T
};

declare type XRReferenceSpaceType =
    'local' | 'local-floor' | 'bounded-floor' | 'unbounded';

declare interface XRFrameOfReferenceOptions {
  disableStageEmulation?: boolean;
  stageEmulationHeight?: number;
}

declare interface XRCoordinateSystem extends EventTarget {
  getTransformTo(other: XRCoordinateSystem): Float32Array;
}

declare interface XRStageBounds {
  readonly geometry: DOMPointReadOnly[];
}

declare interface XRFrameOfReference extends XRCoordinateSystem {
  readonly bounds?: XRStageBounds;
  readonly emulatedHeight: number;

  onboundschange?: (event: Event) => void;
}

declare interface XRPresentationContext {
  readonly canvas: HTMLCanvasElement;
}

declare interface XRSessionCreationOptions {
  immersive?: boolean;
  outputContext: XRPresentationContext;
}

declare interface XRHitResult {
  readonly hitMatrix: Float32Array;
}

declare interface XR extends EventTarget {
  requestDevice(): Promise<XRDevice>;
  requestSession(mode: any, options?: any): any;
  supportsSession(mode: any): Promise<XRSession>;
}

declare interface XRRigidTransform {
  readonly position: DOMPointReadOnly;
  readonly orientation: DOMPointReadOnly;
  readonly matrix: Float32Array;
}

declare interface XRSpace extends EventTarget {
  getTransformTo(other: XRSpace): XRRigidTransform;
}

declare interface XRReferenceSpace extends XRSpace {
  originOffset: XRRigidTransform;
}

type XREye = 'left'|'right';

declare interface XRView {
  readonly eye: XREye;
  readonly projectionMatrix: Float32Array;
  readonly viewMatrix: Float32Array;
  readonly transform: XRRigidTransform;
}

declare interface XRViewerPose {
  readonly transform: XRRigidTransform;
  readonly views: Array<XRView>
}

declare class XRRay {
  readonly origin: DOMPointReadOnly;
  readonly direction: DOMPointReadOnly;
  matrix: Float32Array;

  constructor(origin: DOMPointInit, direction: DOMPointInit)
}

declare interface XRPose {
  readonly emulatedPosition: boolean;
  readonly transform: XRRigidTransform;
}

type XRHandedness = ''|'left'|'right';
type XRTargetRayMode = 'gaze'|'tracked-pointer'|'screen';

declare interface XRInputSource {
  readonly handedness: XRHandedness;
  readonly targetRayMode: XRTargetRayMode;
  readonly targetRaySpace: XRSpace;
  readonly gripSpace?: XRSpace;
  readonly profiles: Array<String>;
}

declare interface XRFrame {
  readonly session: XRSession;
  getViewerPose(referenceSpace?: XRReferenceSpace): XRViewerPose;
  getPose(space: XRSpace, referenceSpace: XRReferenceSpace): XRPose;
}

type XRFrameRequestCallback = (time: number, frame: XRFrame) => void;

declare interface XRRenderState {
  readonly depthNear: number;
  readonly depthFar: number;
  readonly inlineVerticalFieldOfView?: number;
  readonly baseLayer?: XRWebGLLayer;
}

declare interface XRRenderStateInit {
  depthNear?: number;
  depthFar?: number;
  inlineVerticalFieldOfView?: number;
  baseLayer?: XRWebGLLayer;
}

declare interface XRSession extends EventTarget {
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

declare interface XRDevice {
  supportsSession(sessionOptions: XRSessionCreationOptions): Promise<boolean>;
  requestSession(sessionOptions: XRSessionCreationOptions): Promise<XRSession>;
}

declare interface XRViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

declare interface XRLayer {}

declare class XRWebGLLayer implements XRLayer {
  public framebuffer: WebGLFramebuffer;
  public framebufferWidth: number;
  public framebufferHeight: number;

  constructor(
      session: XRSession, gl: WebGLRenderingContext,
      options: WebGLContextAttributes)

  getViewport(view: XRView): XRViewport
}

declare interface Window {
  XRSession?: Constructor<XRSession>;
  XRDevice?: Constructor<XRDevice>;
  XR?: Constructor<XR>;
  XRHitResult?: Constructor<XRHitResult>;
}

declare interface Navigator {
  xr?: XR;
}

declare interface WebGLRenderingContext {
  setCompatibleXRDevice(device: XRDevice): void;
  makeXRCompatible(): Promise<void>;
}
