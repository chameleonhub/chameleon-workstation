// Every IPC channel the renderer is allowed to use. The preload script only bridges these, so a
// compromised renderer can't reach any other ipcMain handler or listen to anything else.

/** renderer -> main, request/response (ipcRenderer.invoke / ipcMain.handle) */
export const INVOKE_CHANNELS = [
    'get-local-db',
    'post-local-db',
    'get-user-data',
    'read-user-administrative-region',
    'read-administrative-region-data',
    'read-taxonomy-data',
    'read-form-media-data',
    'read-app-version',
    'request-user-data-sync',
    'request-app-data-sync',
    'refresh-database',
    'sign-in',
] as const;

/** renderer -> main, fire-and-forget (ipcRenderer.send / ipcMain.on) */
export const SEND_CHANNELS = ['renderer-log'] as const;

/** main -> renderer (webContents.send / ipcRenderer.on) */
export const RECEIVE_CHANNELS = [
    'init-refresh-database',
    'sendSyncProgress',
    'sendSyncResult',
    'sendMsg',
    'sendStatus',
    'log',
] as const;

export type InvokeChannel = (typeof INVOKE_CHANNELS)[number];
export type SendChannel = (typeof SEND_CHANNELS)[number];
export type ReceiveChannel = (typeof RECEIVE_CHANNELS)[number];
