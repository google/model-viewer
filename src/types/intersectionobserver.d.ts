interface IntersectionObserver {
  observe(element: Element): void;
  unobserve(element: Element): void;
  disconnect(): void;
}

interface Window {
  IntersectionObserver?: Constructor<IntersectionObserver>
}
