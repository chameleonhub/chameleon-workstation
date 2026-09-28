// window.bahis is exposed by electron/preload.ts, which limits the renderer to the channels in
// electron/ipcChannels.ts. Import { ipc } from here rather than reaching for the global.
export const ipc = window.bahis;
