import { mainWindow } from './main.ts';
import { SyncProgressState } from './bahis.model.ts';

// Backs a single "Syncing... N/M" indicator (see LoadingSpinner's showSyncProgress prop) that
// replaces firing one Toast per synced item (per taxonomy, per form, per draft, ...) - a full
// sync can touch dozens of items, and a Toast each would flood the screen. Routine per-item
// success is folded into this instead; failures still Toast individually since those need
// attention. A single module-level tracker is fine here: the app enforces a single window/
// instance (see requestSingleInstanceLock in main.ts) and syncs aren't run concurrently with
// each other.
let syncProgress: SyncProgressState = { active: false, completed: 0, total: 0, label: '' };

function sendSyncProgress() {
    mainWindow?.webContents.send('sendSyncProgress', syncProgress);
}

export function startSyncProgress(label = 'Starting sync') {
    syncProgress = { active: true, completed: 0, total: 0, label };
    sendSyncProgress();
}

export function addSyncProgressTotal(count: number) {
    if (!syncProgress.active || count <= 0) return;
    syncProgress = { ...syncProgress, total: syncProgress.total + count };
    sendSyncProgress();
}

export function tickSyncProgress(label: string) {
    if (!syncProgress.active) return;
    syncProgress = { ...syncProgress, completed: syncProgress.completed + 1, label };
    sendSyncProgress();
}

export function endSyncProgress() {
    syncProgress = { active: false, completed: 0, total: 0, label: '' };
    sendSyncProgress();
}

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
