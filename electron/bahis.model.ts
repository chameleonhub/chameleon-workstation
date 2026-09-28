export interface UserData {
    username: string;
    password: string;
}

interface xForm {
    formID: string;
    name: string;
    descriptionText: string;
    downloadUrl: string;
    manifestUrl?: string;
}

export interface Form {
    uid: string;
    name: string;
    description: string;
    xml_url: string;
    manifest_url?: string;
}

interface MediaFile {
    filename: string;
    hash: string;
    downloadUrl: string;
}

export interface ManifestObj {
    manifest: { mediaFile: MediaFile[] };
}

export interface FormListObj {
    xforms: { xform: xForm[] };
}

export interface CloudFormData {
    uuid: string;
    form_id: string;
    xml: string;
    created_at?: string;
}

export interface ToastMessageType {
    type: 'success' | 'warning' | 'error' | 'info';
    text: string;
    action?: boolean;
    duration?: number;
    options?: object;
}

export interface SyncCategoryProgress {
    completed: number;
    total: number;
    currentItem: string;
}

/** How many records of one form have been synced so far, in one direction (see SyncProgressState.formRecords). */
export interface SyncFormRecordProgress {
    name: string;
    direction: 'download' | 'upload';
    completed: number;
    /** Records to sync for this form; 0 until known (or when there is nothing new). */
    total: number;
    failed: number;
    done: boolean;
}

/** The outcome of a finished sync: what SyncCompletePopup shows for a few seconds afterwards. */
export interface SyncResult {
    /** One-line totals, e.g. "8 forms, 1,234 records". */
    summary: string;
    /** What happened to each form's records, from the same tracking as the sync window's "Records by form". */
    forms: SyncFormRecordProgress[];
    hasFailures: boolean;
}

export interface SyncProgressState {
    active: boolean;
    /** Name of the category (table) most recently touched - which one to show on a single-line
     * "which table, how many records" indicator, since several sync concurrently. */
    current: string;
    categories: Record<string, SyncCategoryProgress>;
    /** Per-form record counts, keyed by direction + form uid - what the sync window lists under
     * "Records by form". */
    formRecords: Record<string, SyncFormRecordProgress>;
}
