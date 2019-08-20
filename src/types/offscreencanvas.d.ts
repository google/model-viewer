interface OffscreenCanvas {
  getContext(contextId: "webgl" | "experimental-webgl", contextAttributes?: WebGLContextAttributes): WebGLRenderingContext | null;
}

interface Window {
  OffscreenCanvas?: Constructor<OffscreenCanvas>
}