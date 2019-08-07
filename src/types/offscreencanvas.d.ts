declare class OffscreenCanvas {
  width: number;
  height: number;
  
  constructor(width: number, height: number);
  getContext(contextType: String, contextAttributes?: any) : RenderingContext;
  transferToImageBitmap(): ImageBitmap;
}

interface Window {
  OffscreenCanvas?: Constructor<OffscreenCanvas>
}