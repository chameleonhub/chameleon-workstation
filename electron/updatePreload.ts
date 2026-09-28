import { contextBridge, ipcRenderer } from 'electron';

// The "new update available" dialog (public/update.html) only ever needs these four actions.
contextBridge.exposeInMainWorld('updateDialog', {
    getReleaseNotes: (): Promise<string> => ipcRenderer.invoke('get-release-notes'),
    restart: () => ipcRenderer.send('restart-app'),
    close: () => ipcRenderer.send('close-dialog'),
    openExternal: (url: string) => ipcRenderer.send('open-external', url),
});
