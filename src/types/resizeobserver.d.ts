interface ResizeObserver {
  observe(element: Element): void;
  unobserve(element: Element): void;
  disconnect(): void;
}

interface Window {
  ResizeObserver?: Constructor<ResizeObserver>
}
