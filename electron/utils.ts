import { mainWindow } from './main.ts';

export function Toast(
    text: string,
    type: 'success' | 'warning' | 'error' | 'info' = 'success',
    duration: number = 5000,
    options = {},
) {
    mainWindow?.webContents.send('sendMsg', {
        type,
        text: text,
        duration,
        options,
    });
}

export function setStatus(status: string) {
    mainWindow?.webContents.send('sendStatus', status);
}

export function BrowserLog(text) {
    mainWindow?.webContents.send('log', text);
}
