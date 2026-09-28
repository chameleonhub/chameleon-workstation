import { mainWindow } from './main.ts';
import { SyncFormRecordProgress, SyncProgressState } from './bahis.model.ts';

// Backs a per-category "Syncing... N/M" indicator (see LoadingSpinner's showSyncProgress prop)
// that replaces firing one Toast per synced item (per taxonomy, per form, per draft, ...) - a
// full sync can touch dozens of items, and a Toast each would flood the screen. Routine per-item
// success is folded into this instead; failures still Toast individually since those need
// attention. Tracked per category (e.g. "Forms", "Taxonomies") rather than one flat counter, so
// the UI can show "which form" and "how many" separately per kind of data being synced. A single
// module-level tracker is fine here: the app enforces a single window/instance (see
// requestSingleInstanceLock in main.ts) and syncs aren't run concurrently with each other.
let syncProgress: SyncProgressState = { active: false, current: '', categories: {}, formRecords: {} };

function sendSyncProgress() {
    mainWindow?.webContents.send('sendSyncProgress', syncProgress);
}

export function startSyncProgress() {
    syncProgress = { active: true, current: '', categories: {}, formRecords: {} };
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
    syncProgress = { active: false, current: '', categories: {}, formRecords: {} };
    sendSyncProgress();
}

// Per-form record counts (downloads from KoboToolbox and draft uploads), shown as "Records by form" in the sync
// window - the category counters above only say how many *forms* are done, not how many records each one has.
type RecordDirection = SyncFormRecordProgress['direction'];

function updateFormRecords(
    form: { uid: string; name: string },
    direction: RecordDirection,
    update: (existing: SyncFormRecordProgress) => Partial<SyncFormRecordProgress>,
) {
    if (!syncProgress.active) return;
    const key = `${direction}:${form.uid}`;
    const existing: SyncFormRecordProgress = syncProgress.formRecords[key] ?? {
        name: form.name,
        direction,
        completed: 0,
        total: 0,
        failed: 0,
        done: false,
    };
    syncProgress = {
        ...syncProgress,
        formRecords: { ...syncProgress.formRecords, [key]: { ...existing, ...update(existing) } },
    };
    sendSyncProgress();
}

/** Registers a form (with 0 while the total isn't known yet) or sets how many records it will sync. */
export function setFormRecordsTotal(form: { uid: string; name: string }, direction: RecordDirection, total: number) {
    updateFormRecords(form, direction, () => ({ total }));
}

export function addFormRecordsCompleted(form: { uid: string; name: string }, direction: RecordDirection, count = 1) {
    updateFormRecords(form, direction, (existing) => ({ completed: existing.completed + count }));
}

export function addFormRecordsFailed(form: { uid: string; name: string }, direction: RecordDirection, count = 1) {
    updateFormRecords(form, direction, (existing) => ({ failed: existing.failed + count }));
}

export function finishFormRecords(form: { uid: string; name: string }, direction: RecordDirection) {
    updateFormRecords(form, direction, () => ({ done: true }));
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
