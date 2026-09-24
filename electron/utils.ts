import { mainWindow } from './main.ts';
import { SyncProgressState } from './bahis.model.ts';

// Backs a per-category "Syncing... N/M" indicator (see LoadingSpinner's showSyncProgress prop)
// that replaces firing one Toast per synced item (per taxonomy, per form, per draft, ...) - a
// full sync can touch dozens of items, and a Toast each would flood the screen. Routine per-item
// success is folded into this instead; failures still Toast individually since those need
// attention. Tracked per category (e.g. "Forms", "Taxonomies") rather than one flat counter, so
// the UI can show "which form" and "how many" separately per kind of data being synced. A single
// module-level tracker is fine here: the app enforces a single window/instance (see
// requestSingleInstanceLock in main.ts) and syncs aren't run concurrently with each other.
let syncProgress: SyncProgressState = { active: false, current: '', categories: {} };

function sendSyncProgress() {
    mainWindow?.webContents.send('sendSyncProgress', syncProgress);
}

export function startSyncProgress() {
    syncProgress = { active: true, current: '', categories: {} };
    sendSyncProgress();
}

export function addSyncProgressTotal(category: string, count: number) {
    if (!syncProgress.active || count <= 0) return;
    const existing = syncProgress.categories[category] ?? { completed: 0, total: 0, currentItem: '' };
    syncProgress = {
        ...syncProgress,
        current: category,
        categories: { ...syncProgress.categories, [category]: { ...existing, total: existing.total + count } },
    };
    sendSyncProgress();
}

export function tickSyncProgress(category: string, currentItem: string = '') {
    if (!syncProgress.active) return;
    const existing = syncProgress.categories[category] ?? { completed: 0, total: 0, currentItem: '' };
    syncProgress = {
        ...syncProgress,
        current: category,
        categories: {
            ...syncProgress.categories,
            [category]: { completed: existing.completed + 1, total: existing.total, currentItem },
        },
    };
    sendSyncProgress();
}

export function endSyncProgress() {
    syncProgress = { active: false, current: '', categories: {} };
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
