import { contextBridge, ipcRenderer } from 'electron';
import {
    INVOKE_CHANNELS,
    RECEIVE_CHANNELS,
    SEND_CHANNELS,
    type InvokeChannel,
    type ReceiveChannel,
    type SendChannel,
} from './ipcChannels';

const assertAllowed = (allowed: readonly string[], channel: string) => {
    if (!allowed.includes(channel)) {
        throw new Error(`IPC channel "${channel}" is not allowed`);
    }
};

// The renderer runs with contextIsolation and sandboxing and has no direct access to Electron or
// Node - window.bahis is its only route to the main process, limited to the channels in ipcChannels.ts.
contextBridge.exposeInMainWorld('bahis', {
    invoke: (channel: InvokeChannel, ...args: unknown[]) => {
        assertAllowed(INVOKE_CHANNELS, channel);
        return ipcRenderer.invoke(channel, ...args);
    },
    send: (channel: SendChannel, ...args: unknown[]) => {
        assertAllowed(SEND_CHANNELS, channel);
        ipcRenderer.send(channel, ...args);
    },
    // Returns an unsubscribe function: a listener crosses the bridge as a proxy, so it can't later be
    // handed back to removeListener by identity.
    on: (channel: ReceiveChannel, listener: (...args: unknown[]) => void) => {
        assertAllowed(RECEIVE_CHANNELS, channel);
        const wrapped = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(...args);
        ipcRenderer.on(channel, wrapped);
        return () => {
            ipcRenderer.removeListener(channel, wrapped);
        };
    },
});

function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
    return new Promise((resolve) => {
        if (condition.includes(document.readyState)) {
            resolve(true);
        } else {
            document.addEventListener('readystatechange', () => {
                if (condition.includes(document.readyState)) {
                    resolve(true);
                }
            });
        }
    });
}

const safeDOM = {
    append(parent: HTMLElement, child: HTMLElement) {
        if (!Array.from(parent.children).find((e) => e === child)) {
            parent.appendChild(child);
        }
    },
    remove(parent: HTMLElement, child: HTMLElement) {
        if (Array.from(parent.children).find((e) => e === child)) {
            parent.removeChild(child);
        }
    },
};

/**
 * https://tobiasahlin.com/spinkit
 * https://connoratherton.com/loaders
 * https://projects.lukehaas.me/css-loaders
 * https://matejkustec.github.io/SpinThatShit
 */
function useLoading() {
    const className = `loaders-css__square-spin`;
    const styleContent = `
@keyframes square-spin {
  25% { transform: perspective(100px) rotateX(180deg) rotateY(0); }
  50% { transform: perspective(100px) rotateX(180deg) rotateY(180deg); }
  75% { transform: perspective(100px) rotateX(0) rotateY(180deg); }
  100% { transform: perspective(100px) rotateX(0) rotateY(0); }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `;
    const oStyle = document.createElement('style');
    const oDiv = document.createElement('div');

    oStyle.id = 'app-loading-style';
    oStyle.innerHTML = styleContent;
    oDiv.className = 'app-loading-wrap';
    oDiv.innerHTML = `<div class="${className}"><div></div></div>`;

    return {
        appendLoading() {
            safeDOM.append(document.head, oStyle);
            safeDOM.append(document.body, oDiv);
        },
        removeLoading() {
            safeDOM.remove(document.head, oStyle);
            safeDOM.remove(document.body, oDiv);
        },
    };
}

// ----------------------------------------------------------------------
const { appendLoading, removeLoading } = useLoading();
domReady().then(appendLoading);

// addEventListener (not window.onmessage): with contextIsolation the preload has its own JS world, and
// only listeners registered this way receive the page's postMessage (see src/main.tsx).
window.addEventListener('message', (ev) => {
    ev.data?.payload === 'removeLoading' && removeLoading();
});

setTimeout(removeLoading, 4999);
