interface ResizeObserverSize {
  inlineSize: number;
  blockSize: number;
}

interface ResizeObserverEntry {
  target: Element;
  contentRect: DOMRectReadOnly;
  borderBoxSize: ResizeObserverSize;
  contentBoxSize: ResizeObserverSize;
}

declare class ResizeObserver {
  constructor(callback: (entries: Array<ResizeObserverEntry>) => void);
  observe(element: Element): void;
  unobserve(element: Element): void;
  disconnect(): void;
}

interface Window {
  ResizeObserver?: Constructor<ResizeObserver>
}
