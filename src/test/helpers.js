export const elementFromLocalPoint = (document, x, y) => {
  const host =
      document === window.document ? window.document.body : document.host;
  const boundingRect = host.getBoundingClientRect();

  return document.elementFromPoint(boundingRect.left + x, boundingRect.top + y);
};

export const pickShadowDescendant = (element, x = 0, y = 0) => {
  return elementFromLocalPoint(element.shadowRoot, x, y);
};

export const timePasses = (ms = 0) =>
    new Promise(resolve => setTimeout(resolve, ms));
