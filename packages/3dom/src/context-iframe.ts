import {ThreeDOMCapability} from './api.js';
import {ThreeDOMExecutionContext} from './context.js';
import {ThreeDOMMessageType} from './protocol.js';

// This semi fake worker is used to capture the post message of the handshake
// and delay it until the port is given.
class IFrameWorker extends Worker {
  protected handshakeMessage: any;
  protected port2: MessagePort|null = null;

  constructor(url: string) {
    super(url);
  }

  // Override
  postMessage(message: any, transfer: Array<Transferable>): void;
  postMessage(message: any, options?: PostMessageOptions|undefined): void;
  postMessage(message: any, secondArg: any): void {
    if (message.type == ThreeDOMMessageType.HANDSHAKE) {
      this.handshakeMessage = message;
      this.postHandshakeMessage();
    } else {
      super.postMessage(message, secondArg);
    }
  }

  setPort2(port2: MessagePort): void {
    this.port2 = port2;
    this.postHandshakeMessage();
  }

  protected postHandshakeMessage() {
    if (this.handshakeMessage && this.port2) {
      super.postMessage(this.handshakeMessage, [this.port2]);
    }
  }
}

export class IFrameThreeDOMExecutionContext extends ThreeDOMExecutionContext {
  constructor(capabilities: Array<ThreeDOMCapability>) {
    super(capabilities);
    const onMessageReceived = (event: MessageEvent) => {
      switch (event.data.action) {
        case 'handshakeRequest': {
          if (!event.source) {
            throw new Error('No event source to post message to.');
          }
          const script = document.querySelector('script[type="3DOM"]');
          if (!script) {
            throw new Error('No 3DOM script found in the page.');
          }
          const scriptText = script.textContent;
          // TODO: Check is the scriptText has content?

          // Pass the transferred port to the worker
          const iframeWorker = this.worker as IFrameWorker;
          iframeWorker.setPort2(event.ports[0]);

          // Respond to the host so it can inject the 3DOM script
          const source = event.source as WindowProxy;
          source.postMessage(
              {action: 'handshakeResponse', payload: scriptText}, event.origin);
          break;
        }
        case 'ready':
          window.removeEventListener('message', onMessageReceived);
          window.dispatchEvent(
              new CustomEvent('3domready', {detail: {executionContext: this}}));
          break;
      }
    };
    window.addEventListener('message', onMessageReceived);
  }

  // Override
  protected createWorker(url: string): Worker {
    return new IFrameWorker(url);
  }
}
