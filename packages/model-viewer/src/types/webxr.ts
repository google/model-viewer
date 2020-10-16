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
    'local' | 'local-floor' | 'bounded-floor' | 'unbounded' | 'viewer';

declare type XRSessionMode = 'inline' | 'immersive-ar' | 'immersive-vr';

declare interface XRPresentationContext {
  readonly canvas: HTMLCanvasElement;
}

declare interface XRHitTestSource {
  cancel(): void;
}

declare interface XRTransientInputHitTestSource {
  cancel(): void;
}

declare interface XRHitTestResult {
  getPose(baseSpace: XRSpace): XRPose|null;
}

declare interface XRTransientInputHitTestResult {
  readonly inputSource: XRInputSource;
  readonly results: Array<XRHitTestResult>;
}

declare interface XR extends EventTarget {
  requestSession(mode: XRSessionMode, options?: any): Promise<XRSession>;
  isSessionSupported(mode: XRSessionMode): Promise<boolean>;
}

declare interface XRRigidTransform {
  readonly position: DOMPointReadOnly;
  readonly orientation: DOMPointReadOnly;
  readonly matrix: Float32Array;
  readonly inverse: XRRigidTransform;
}

declare interface XRSpace extends EventTarget {}

declare interface XRReferenceSpace extends XRSpace {
  getOffsetReferenceSpace(originOffset: XRRigidTransform): XRReferenceSpace;
}

type XREye = 'left'|'right';

declare interface XRView {
  readonly eye: XREye;
  readonly projectionMatrix: Float32Array;
  readonly viewMatrix: Float32Array;
  readonly transform: XRRigidTransform;
  readonly recommendedViewportScale: number|null;
  requestViewportScale(scale: number|null): void;
}

declare interface XRViewerPose {
  readonly transform: XRRigidTransform;
  readonly views: Array<XRView>
}

declare interface XRRayDirectionInit {
  x?: number;
  y?: number;
  z?: number;
  w?: number;
}

declare class XRRay {
  readonly origin: DOMPointReadOnly;
  readonly direction: XRRayDirectionInit;
  matrix: Float32Array;

  constructor(origin: DOMPointInit, direction: XRRayDirectionInit)
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
  readonly gamepad: Gamepad;
}

declare interface XRInputSourceEvent extends Event {
  readonly frame: XRFrame;
  readonly inputSource: XRInputSource;
}

declare interface XRFrame {
  readonly session: XRSession;
  getViewerPose(referenceSpace?: XRReferenceSpace): XRViewerPose;
  getPose(space: XRSpace, referenceSpace: XRReferenceSpace): XRPose;
  getHitTestResults(hitTestSource: XRHitTestSource): Array<XRHitTestResult>;
  getHitTestResultsForTransientInput(hitTestSource:
                                         XRTransientInputHitTestSource):
      Array<XRTransientInputHitTestResult>;
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

declare interface XRHitTestOptionsInit {
  space: XRSpace;
  offsetRay?: XRRay;
}

declare interface XRTransientInputHitTestOptionsInit {
  profile: string;
  offsetRay?: XRRay;
}

declare interface XRSession extends EventTarget {
  renderState: XRRenderState;
  updateRenderState(state?: XRRenderStateInit): any;
  requestReferenceSpace(type: XRReferenceSpaceType): Promise<XRReferenceSpace>;
  requestHitTestSource(options: XRHitTestOptionsInit): Promise<XRHitTestSource>;
  requestHitTestSourceForTransientInput(options:
                                            XRTransientInputHitTestOptionsInit):
      Promise<XRTransientInputHitTestSource>;
  inputSources: Array<XRInputSource>;
  requestAnimationFrame(callback: XRFrameRequestCallback): number;
  cancelAnimationFrame(id: number): void;
  end(): Promise<void>;
}

declare interface XRViewport {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

declare interface XRLayer {}

declare interface XRWebGLLayerInit {
  antialias?: boolean;
  depth?: boolean;
  stencil?: boolean;
  alpha?: boolean;
  ignoreDepthValues?: boolean;
  framebufferScaleFactor?: number;
}

declare class XRWebGLLayer implements XRLayer {
  public framebuffer: WebGLFramebuffer;
  public framebufferWidth: number;
  public framebufferHeight: number;

  constructor(
      session: XRSession, gl: WebGLRenderingContext, options: XRWebGLLayerInit)

  getViewport(view: XRView): XRViewport
}

declare interface Window {
  XRSession?: Constructor<XRSession>;
  XR?: Constructor<XR>;
}

declare interface Navigator {
  xr?: XR;
}

declare interface WebGLRenderingContext {
  makeXRCompatible(): Promise<void>;
}
