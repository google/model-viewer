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

interface XRSession {
  requestHitTest(
      origin: Float32Array, direction: Float32Array,
      frameOfReference: XRFrameOfReference): Promise<XRHitResult[]>
}

interface XRDevice {
  supportsSession(sessionOptions: XRSessionCreationOptions): Promise<boolean>;
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
