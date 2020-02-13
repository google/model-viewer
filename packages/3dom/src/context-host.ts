import {ThreeDOMCapability} from './api.js';
import {ThreeDOMExecutionContext} from './context.js';
import {ThreeDOMMessageType} from './protocol.js';

// This fake worker class is just used to capture the transfer of the message
// port.
class FakeWorker extends EventTarget implements Worker {
  onerror: EventListener|null = null;
  onmessage: EventListener|null = null;
  onmessageerror: EventListener|null = null;
  port2: MessagePort|null = null;
  hostExecutionContext: HostThreeDOMExecutionContext;

  constructor(hostExecutionContext: HostThreeDOMExecutionContext) {
    super();
    this.hostExecutionContext = hostExecutionContext;
  }

  postMessage(message: any, transfer: Array<Transferable>): void;
  postMessage(message: any, options?: PostMessageOptions|undefined): void;
  postMessage(message: any, secondArg: any): void {
    // When the handshake message is sent, capture and store the port.
    if (message.type == ThreeDOMMessageType.HANDSHAKE) {
      const transfer = secondArg as Array<Transferable>;
      this.port2 = transfer[0] as MessagePort;
      // Indicate the host execution context that the port has been captured.
      this.hostExecutionContext.portHasBeenSet();
    }
  }

  terminate() {
    this.port2 = null;
  }
}

const $iframe = Symbol('iframe');
const $iframeLoaded = Symbol('iframeLoaded');

export class HostThreeDOMExecutionContext extends ThreeDOMExecutionContext {
  protected[$iframe]: HTMLIFrameElement;
  protected[$iframeLoaded] = false;

  constructor(
      capabilities: Array<ThreeDOMCapability>,
      iframe: HTMLIFrameElement|null = null) {
    super(capabilities);
    // Make sure there is an iframe to connect with
    if (!iframe) {
      iframe = document.querySelector('iframe');
      if (!iframe) {
        throw new Error(
            'Either provide an iframe or the page should contain and iframe.');
      }
    }
    this[$iframe] = iframe;
    // Wait for the iframe to load
    const onIFrameLoaded = () => {
      this[$iframeLoaded] = true;
      this[$iframe].removeEventListener('load', onIFrameLoaded);
      this.sendHandshakeToIFrame();
    };
    this[$iframe].addEventListener('load', onIFrameLoaded);
  }

  // Called from the FakeWorker when the postMessage is passed.
  portHasBeenSet() {
    this.sendHandshakeToIFrame();
  }

  protected sendHandshakeToIFrame() {
    // Wait until the iframe is loaded AND the port has been set
    const fakeWorker = this.worker as FakeWorker;
    const port2 = fakeWorker.port2;
    if (!this[$iframeLoaded] || !port2) {
      return;
    }
    // Listen for messages from the iframe
    const onMessageReceived = (event: MessageEvent) => {
      // If the iframe send the handshake response, it will contain the 3DOM
      // script to be loaded, so evaluate it (it will actually be received and
      // evaluated in the iframe's worker).
      if (event.data.action === 'handshakeResponse') {
        // No need to listen to more messages from the iframe
        window.removeEventListener('message', onMessageReceived);
        // Load the script passed from the iframe
        this.eval(event.data.payload);
        // Indicate the iframe that the host is ready
        const contentWindow = this[$iframe].contentWindow;
        if (contentWindow) {
          contentWindow.postMessage({action: 'ready'}, '*');
        }
        window.dispatchEvent(
            new CustomEvent('3domready', {detail: {executionContext: this}}));
      }
    };
    window.addEventListener('message', onMessageReceived);
    // Send the hadnshake to the iframe transferring the port
    const contentWindow = this[$iframe].contentWindow;
    if (contentWindow) {
      contentWindow.postMessage({action: 'handshakeRequest'}, '*', [port2]);
    }
  }

  // Override
  protected createWorker(_url: string): Worker {
    return new FakeWorker(this);
  }
}
