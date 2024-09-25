export {};

declare global {
    interface Window {
        electronAPI: {
            sendMessage: (message: string) => void;
            onMessage: (callback: (message: string) => void) => void;
        };
    }
}
