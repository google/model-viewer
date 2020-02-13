import { HostThreeDOMExecutionContext } from '../../lib/context-host.js';

const context =
    new HostThreeDOMExecutionContext(['messaging', 'material-properties']);
function threeDOMReady() {
  window.removeEventListener('3domReady', threeDOMReady);
  const modelViewer = document.querySelector('model-viewer');
  modelViewer.setThreeDOMExecutionContext(context);
}
window.addEventListener('3domready', threeDOMReady);
