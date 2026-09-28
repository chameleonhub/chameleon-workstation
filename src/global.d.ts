import type { InvokeChannel, ReceiveChannel, SendChannel } from '../electron/ipcChannels';

export {};

declare global {
    // The renderer's only route to the main process, exposed by electron/preload.ts.
    interface Window {
        bahis: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            invoke: (channel: InvokeChannel, ...args: unknown[]) => Promise<any>;
            send: (channel: SendChannel, ...args: unknown[]) => void;
            /** Subscribes to a main-process message; returns a function that unsubscribes. */
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            on: (channel: ReceiveChannel, listener: (...args: any[]) => void) => () => void;
        };
    }
}
