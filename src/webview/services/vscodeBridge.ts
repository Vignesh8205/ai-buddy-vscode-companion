import { HostToWebviewMessage, WebviewToHostMessage } from '../../shared/types';

interface VsCodeApi {
  postMessage(message: WebviewToHostMessage): void;
  getState(): any;
  setState(state: any): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

let vscodeInstance: VsCodeApi | null = null;

export function getVsCodeApi(): VsCodeApi {
  if (!vscodeInstance) {
    if (typeof acquireVsCodeApi !== 'undefined') {
      vscodeInstance = acquireVsCodeApi();
    } else {
      // Mock for browser testing outside VS Code
      vscodeInstance = {
        postMessage: (msg: any) => console.log('[VSCode Mock PostMessage]', msg),
        getState: () => ({}),
        setState: (st: any) => console.log('[VSCode Mock SetState]', st),
      };
    }
  }
  return vscodeInstance;
}

export function subscribeToHostMessages(handler: (msg: HostToWebviewMessage) => void): () => void {
  const listener = (event: MessageEvent) => {
    const message = event.data as HostToWebviewMessage;
    if (message && message.type) {
      handler(message);
    }
  };

  window.addEventListener('message', listener);
  return () => window.removeEventListener('message', listener);
}
