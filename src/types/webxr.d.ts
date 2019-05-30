type Constructor<T = object> = {
  new (...args: any[]): T,
  prototype: T
};

type XRFrameOfReferenceType = 'head-model'|'eye-level'|'stage';

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
}

interface XRRigidTransform {
  readonly position: DOMPointReadOnly;
  readonly orientation: DOMPointReadOnly;
  readonly matrix: Float32Array;
}

interface XRSpace extends EventTarget {
  getTransformTo(other: XRSpace): XRRigidTransform;
}

type XRReferenceSpaceType = 'stationary'|'bounded'|'unbounded';

interface XRReferenceSpaceOptions {
  type: XRReferenceSpaceType;
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

interface XRRay {
  readonly origin: DOMPointReadOnly;
  readonly direction: DOMPointReadOnly;
  matrix: Float32Array;
}

interface XRInputPose {
  readonly emulatedPosition: boolean;
  readonly targetRay: XRRay;
  readonly gripTransform: XRRigidTransform;
}

type XRHandedness = ''|'left'|'right';
type XRTargetRayMode = 'gaze'|'tracked-pointer'|'screen';

interface XRInputSource {
  readonly handedness: XRHandedness;
  readonly targetRayMode: XRTargetRayMode;
}

interface XRFrame {
  readonly session: XRSession;
  getViewerPose(referenceSpace?: XRReferenceSpace): XRViewerPose;
  getInputPose(inputSource: XRInputSource, referenceSpace?: XRReferenceSpace):
      XRInputPose;
}

type XRFrameRequestCallback = (time: number, frame: XRFrame) => void;

interface XRSession extends EventTarget {
  baseLayer: XRLayer;
  requestReferenceSpace(options: XRReferenceSpaceOptions):
      Promise<XRReferenceSpace>;
  requestHitTest(
      origin: Float32Array, direction: Float32Array,
      frameOfReference: XRFrameOfReference): Promise<XRHitResult[]>;
  getInputSources(): Array<XRInputSource>;
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
}